import {existsSync} from 'node:fs';
import {isAbsolute} from 'node:path';

// Explicit lists: newly added upstream tools do not silently gain authority.
export const inspectTools = Object.freeze([
  'flockbay_status','flockbay_godot_status','flockbay_project_info',
  'flockbay_project_files','flockbay_project_settings','flockbay_script_read',
  'flockbay_class','flockbay_guide','flockbay_last_run',
  'flockbay_game_tree','flockbay_game_ui',
  'flockbay_game_screenshot','flockbay_editor_screenshot',
]);
export const buildTools = Object.freeze([...inspectTools,
  // game_get can call arbitrary methods through sample.calls; Build only.
  'flockbay_game_get',
  'flockbay_scene_tree','flockbay_node_get','flockbay_resource_read','flockbay_signals',
  'flockbay_scene_open','flockbay_scene_save','flockbay_scene_create',
  'flockbay_node_add','flockbay_node_set','flockbay_node_move','flockbay_node_duplicate',
  'flockbay_node_rename','flockbay_node_delete','flockbay_resource_create','flockbay_resource_set',
  'flockbay_script_write','flockbay_script_attach','flockbay_script_errors',
  'flockbay_signal_connect','flockbay_signal_disconnect','flockbay_set_input_action',
  'flockbay_set_project_settings','flockbay_reimport','flockbay_import_settings',
  'flockbay_file_move','flockbay_file_delete','flockbay_undo',
  'flockbay_play','flockbay_stop','flockbay_run_headless','flockbay_game_input',
  'flockbay_game_set','flockbay_game_call','flockbay_game_eval','flockbay_game_step',
  'flockbay_game_time','flockbay_game_stats','flockbay_game_profile','flockbay_game_audio',
  'flockbay_editor_run','flockbay_model_read','flockbay_asset_search',
  'flockbay_asset_inspect','flockbay_asset_import','flockbay_plugin_search',
]);

export function validateFlockbay(connection) {
  if (!connection || typeof connection !== 'object' || Array.isArray(connection) ||
      typeof connection.command !== 'string' || !isAbsolute(connection.command) || !existsSync(connection.command) ||
      !Array.isArray(connection.args) || !connection.args.every(a => typeof a === 'string') ||
      !connection.env || typeof connection.env !== 'object' || Array.isArray(connection.env) ||
      Object.keys(connection.env).some(k => k !== 'FLOCKBAY_MCP_DESCRIPTOR') ||
      typeof connection.env.FLOCKBAY_MCP_DESCRIPTOR !== 'string' ||
      !isAbsolute(connection.env.FLOCKBAY_MCP_DESCRIPTOR) || !existsSync(connection.env.FLOCKBAY_MCP_DESCRIPTOR)) {
    throw Error('Invalid Flockbay connection. Copy its local command, args and descriptor environment from the Flockbay Codex setup.');
  }
  return {command:connection.command,args:[...connection.args],env:{...connection.env}};
}

