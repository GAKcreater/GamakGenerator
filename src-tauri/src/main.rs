// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod engine;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            engine::generate_test_points,
            engine::apply_physics,
            engine::get_mask_info,
            engine::generate_convex_hull
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
