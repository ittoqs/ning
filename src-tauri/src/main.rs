#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use sysinfo::{System, Disks};
use serde::{Deserialize, Serialize};
use std::net::TcpStream;
use std::time::Duration;
use std::path::Path;
use std::sync::Mutex;
use std::sync::Arc;
use std::fs;
use once_cell::sync::Lazy;
use rusqlite::{params, Connection};
use sqlite_vec::sqlite3_vec_init;

static DB_CONN: Lazy<Arc<Mutex<Option<Connection>>>> = Lazy::new(|| Arc::new(Mutex::new(None)));

#[derive(Serialize)]
struct SystemSpecs {
    total_memory: u64,
    free_memory: u64,
    cpu_cores: usize,
    cpu_brand: String,
    os_name: String,
    device_name: String,
    total_storage: u64,
}

#[derive(Serialize)]
struct ProxyResponse {
    status: u16,
    text: String,
}

#[tauri::command]
fn extract_pdf(path: String) -> Result<String, String> {
    if !Path::new(&path).exists() {
        return Err("File does not exist".to_string());
    }
    match pdf_extract::extract_text(&path) {
        Ok(text) => Ok(text),
        Err(e) => Err(format!("Failed to extract PDF: {}", e)),
    }
}

#[tauri::command]
fn init_db() -> Result<(), String> {
    let mut conn_lock = DB_CONN.lock().unwrap();
    if conn_lock.is_some() {
        return Ok(());
    }

    // Load sqlite-vec extension via auto_extension so new connections load it automatically
    unsafe {
        rusqlite::ffi::sqlite3_auto_extension(Some(std::mem::transmute(sqlite3_vec_init as *const ())));
    }

    // We must reopen/open to apply the auto extensions to our conn
    let conn = Connection::open_in_memory().map_err(|e| e.to_string())?;

    // Create a regular table for documents
    conn.execute(
        "CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Create a virtual table for embeddings using sqlite-vec
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS vss_documents USING vec0(
            embedding float[768] -- assuming nomic-embed-text size
        )",
        [],
    ).map_err(|e| e.to_string())?;

    *conn_lock = Some(conn);
    Ok(())
}

#[derive(Deserialize)]
struct EmbeddingInput {
    text: String,
    embedding: Vec<f32>,
}

#[tauri::command]
fn insert_embedding(text: String, embedding: Vec<f32>) -> Result<(), String> {
    let mut conn_lock = DB_CONN.lock().unwrap();
    let conn = conn_lock.as_mut().ok_or("Database not initialized")?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO documents (text) VALUES (?1)",
        params![text],
    ).map_err(|e| e.to_string())?;

    let last_id = tx.last_insert_rowid();

    // Convert f32 vec to JSON string for sqlite-vec
    let embedding_json = serde_json::to_string(&embedding).map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO vss_documents (rowid, embedding) VALUES (?1, ?2)",
        params![last_id, embedding_json],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Serialize)]
struct QueryResult {
    text: String,
    distance: f32,
}

#[tauri::command]
fn query_embeddings(embedding: Vec<f32>, limit: usize) -> Result<Vec<QueryResult>, String> {
    let conn_lock = DB_CONN.lock().unwrap();
    let conn = conn_lock.as_ref().ok_or("Database not initialized")?;

    let embedding_json = serde_json::to_string(&embedding).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT d.text, v.distance
         FROM vss_documents v
         JOIN documents d ON d.id = v.rowid
         WHERE v.embedding MATCH ?1
         ORDER BY v.distance ASC
         LIMIT ?2"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![embedding_json, limit], |row| {
        Ok(QueryResult {
            text: row.get(0)?,
            distance: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }

    Ok(results)
}

#[derive(Deserialize)]
struct ExecuteToolInput {
    tool: String,
    args: std::collections::HashMap<String, String>,
}

#[tauri::command]
fn execute_tool(tool: String, args: std::collections::HashMap<String, String>) -> Result<String, String> {
    match tool.as_str() {
        "read_file" => {
            if let Some(path) = args.get("path") {
                fs::read_to_string(path).map_err(|e| e.to_string())
            } else {
                Err("Missing 'path' argument for read_file tool".to_string())
            }
        },
        "list_dir" => {
            if let Some(path) = args.get("path") {
                let mut entries = Vec::new();
                for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
                    let entry = entry.map_err(|e| e.to_string())?;
                    let path = entry.path();
                    entries.push(path.display().to_string());
                }
                Ok(entries.join("\n"))
            } else {
                Err("Missing 'path' argument for list_dir tool".to_string())
            }
        },
        "get_time" => {
            Ok(chrono::Local::now().to_rfc3339())
        },
        _ => Err(format!("Unknown tool: {}", tool)),
    }
}

#[tauri::command]
fn get_system_specs() -> SystemSpecs {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpus = sys.cpus();
    let cpu_brand = if !cpus.is_empty() {
        cpus[0].brand().to_string()
    } else {
        "Unknown CPU".to_string()
    };

    let disks = Disks::new_with_refreshed_list();
    let total_storage = disks.iter().map(|d| d.total_space()).sum::<u64>();

    let os_name_long = System::long_os_version().unwrap_or_else(|| System::name().unwrap_or_else(|| "Unknown".to_string()));

    SystemSpecs {
        total_memory: sys.total_memory() / 1024 / 1024, // In MB
        free_memory: sys.free_memory() / 1024 / 1024, // In MB
        cpu_cores: sys.cpus().len(),
        cpu_brand,
        os_name: os_name_long,
        device_name: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
        total_storage: total_storage / 1024 / 1024, // In MB
    }
}

#[tauri::command]
fn check_ollama_status() -> bool {
    // Ping port 11434 to see if Ollama is running
    match TcpStream::connect_timeout(
        &"127.0.0.1:11434".parse().unwrap(),
        Duration::from_millis(500),
    ) {
        Ok(_) => true,
        Err(_) => false,
    }
}

fn is_allowed_url(url: &str) -> bool {
    url.starts_with("http://localhost:11434") || url.starts_with("http://127.0.0.1:11434")
}

#[tauri::command]
async fn proxy_request(method: String, url: String, body: Option<String>) -> Result<ProxyResponse, String> {
    if !is_allowed_url(&url) {
        return Err("URL not allowed".to_string());
    }

    let client = reqwest::Client::new();
    let mut req = match method.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        _ => return Err("Unsupported method".to_string()),
    };
    if let Some(b) = body {
        req = req.body(b).header("Content-Type", "application/json");
    }
    match req.send().await {
        Ok(res) => {
            let status = res.status().as_u16();
            let text = res.text().await.map_err(|e| e.to_string())?;
            Ok(ProxyResponse { status, text })
        },
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn proxy_stream(window: tauri::Window, id: String, method: String, url: String, body: Option<String>) -> Result<(), String> {
    if !is_allowed_url(&url) {
        return Err("URL not allowed".to_string());
    }

    let client = reqwest::Client::new();
    let mut req = match method.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        _ => return Err("Unsupported method".to_string()),
    };
    if let Some(b) = body {
        req = req.body(b).header("Content-Type", "application/json");
    }

    let mut res = match req.send().await {
        Ok(res) => {
            if !res.status().is_success() {
                let err_msg = format!("HTTP Error {}", res.status());
                let _ = window.emit(&format!("stream_error_{}", id), err_msg);
                return Err("Stream returned error status".to_string());
            }
            res
        },
        Err(e) => {
            let _ = window.emit(&format!("stream_error_{}", id), e.to_string());
            return Err(e.to_string());
        }
    };

    while let Some(chunk) = res.chunk().await.map_err(|e| e.to_string())? {
        let bytes: Vec<u8> = chunk.to_vec();
        let _ = window.emit(&format!("stream_{}", id), bytes);
    }

    let _ = window.emit(&format!("stream_done_{}", id), ());
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            extract_pdf,
            init_db,
            insert_embedding,
            query_embeddings,
            execute_tool,
            get_system_specs,
            check_ollama_status,
            proxy_request,
            proxy_stream
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
