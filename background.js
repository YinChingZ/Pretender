// 默认设置
const defaultSettings = {
  displayActive: false,
  presets: [
    {
      id: 'default',
      name: '默认文本',
      text: '这是一个示例文本。您可以在此输入任何您需要的内容。'
    }
  ],
  currentPresetId: 'default',
  appearance: {
    opacity: 0.7,
    fontSize: 14,
    previewLength: 15,
    width: 300,
    textColor: '#000000',
    backgroundColor: '#f0f0f0',
    borderColor: '#4285f4'
  },
  behavior: {
    autoHide: false,
    hideDelay: 5,
    hoverMode: false,
    miniMode: false,
    rememberPosition: true,
    position: {
      top: '10px',
      left: 'auto',
      right: '10px'
    },
    stealth: {
      stealthMode: false,
      noBorder: false,
      ultraTransparent: false,
      stealthOption: 'none',
      blendIn: false,
      fadeNearEdge: false,
      autoPosition: false
    }
  },
  advanced: {
    matchSensitivity: 'moderate',
    advanceMode: 'auto'
  }
};

// 初始化扩展设置
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.get(['settings'], function(result) {
    if (!result.settings) {
      chrome.storage.local.set({ 'settings': defaultSettings });
    }
  });
});

// 注册命令监听器，用于键盘快捷键
chrome.commands.onCommand.addListener(function(command) {
  if (command === 'toggle-display') {
    chrome.storage.local.get(['settings'], function(result) {
      const settings = result.settings || defaultSettings;
      settings.displayActive = !settings.displayActive;
      
      chrome.storage.local.set({ 'settings': settings });
      
      // 向所有标签页发送消息
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
          chrome.tabs.sendMessage(tab.id, {
            action: "toggleDisplay",
            state: settings.displayActive
          }).catch(() => {}); // 忽略错误
        });
      });
    });
  }
});

// 添加到 background.js 中
// 消息转发功能，帮助解决通信问题
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "forwardToActiveTab") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id, 
          request.message, 
          function(response) {
            // 检查 chrome.runtime.lastError 以抑制在接收端不存在时出现的常见错误。
            // 这是预期的行为，例如当弹出窗口在 chrome://extensions 页面上打开时。
            if (chrome.runtime.lastError) {
              // 向发送方（popup.js）发回一个错误消息，尽管它当前没有处理这个消息，
              // 但这是一种更完整的做法，并且可以防止出现“未检查”的错误。
              sendResponse({ error: chrome.runtime.lastError.message });
            } else {
              sendResponse(response);
            }
          }
        );
      } else {
        sendResponse({error: "No active tab found"});
      }
    });
    return true; // 保持消息通道开放，等待异步响应
  }
});