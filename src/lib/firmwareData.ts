import mainCpp from '../../firmware/main.cpp?raw';
import globalStateH from '../../firmware/GLOBAL_STATE.h?raw';
import bmsH from '../../firmware/bms.h?raw';
import displayH from '../../firmware/display.h?raw';
import lgfxConfigH from '../../firmware/lgfx_config.h?raw';
import webServerH from '../../firmware/web_server.h?raw';
import htmlPageH from '../../firmware/html_page.h?raw';
import wifiManagerH from '../../firmware/wifi_manager.h?raw';
import apiClientH from '../../firmware/api_client.h?raw';

export const FIRMWARE_FILES: Record<string, string> = {
  'main.cpp': mainCpp,
  'GLOBAL_STATE.h': globalStateH,
  'bms.h': bmsH,
  'display.h': displayH,
  'lgfx_config.h': lgfxConfigH,
  'web_server.h': webServerH,
  'html_page.h': htmlPageH,
  'wifi_manager.h': wifiManagerH,
  'api_client.h': apiClientH,
};
