// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod engine;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            engine::generate_test_points
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
