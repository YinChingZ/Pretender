let displayElement = null;
let assistantText = '';
let currentPosition = 0;
let settings = null;
let autoHideTimer = null;
let isDocumentFocused = true;

// 初始化设置
function initializeSettings() {
  chrome.storage.local.get(['settings'], function(result) {
    if (result.settings) {
      settings = result.settings;
      // 获取当前预设的文本
      const currentPreset = getCurrentPreset();
      if (currentPreset) {
        assistantText = currentPreset.text;
      }
      
      if (settings.displayActive) {
        createDisplayElement();
        applySettings();
        showDisplay();
      }
    } else {
      // 如果没有设置，则不执行任何操作，因为 background.js 应该已经处理了初始化
      console.log("文本辅助输入：等待 background.js 初始化设置。");
    }
  });
}

// 创建显示元素
function createDisplayElement() {
  if (!displayElement) {
    displayElement = document.createElement('div');
    displayElement.className = 'text-assistant-display';
    document.body.appendChild(displayElement);
    
    // 双击最小化/最大化
    displayElement.addEventListener('dblclick', function() {
      displayElement.classList.toggle('minimized');
    });
    
    // 设置为可拖动
    displayElement.setAttribute('draggable', true);
    
    displayElement.addEventListener('dragstart', function(e) {
      const rect = displayElement.getBoundingClientRect();
      e.dataTransfer.setData('text/plain', '');
      displayElement.dataset.offsetX = e.clientX - rect.x;
      displayElement.dataset.offsetY = e.clientY - rect.y;
    });

    document.addEventListener('dragover', function(e) {
      e.preventDefault();
    });

    document.addEventListener('drop', function(e) {
      if (displayElement.getAttribute('draggable') === 'true') {
        e.preventDefault();
        const offsetX = parseInt(displayElement.dataset.offsetX) || 0;
        const offsetY = parseInt(displayElement.dataset.offsetY) || 0;
        
        const newTop = (e.clientY - offsetY) + 'px';
        const newLeft = (e.clientX - offsetX) + 'px';
        
        displayElement.style.top = newTop;
        displayElement.style.left = newLeft;
        displayElement.style.right = 'auto';
        
        // 如果启用了记住位置，则保存位置
        if (settings && settings.behavior.rememberPosition) {
          settings.behavior.position = {
            top: newTop,
            left: newLeft,
            right: 'auto'
          };
          
          // 在调用API前检查上下文是否有效
          if (chrome.runtime && chrome.runtime.id) {
            chrome.storage.local.set({ 'settings': settings });
          }
        }
      }
    });
  }
  return displayElement;
}

// 应用设置到显示元素
function applySettings() {
  if (!settings) return; // 如果设置尚未加载，则不执行任何操作

  if (!displayElement) {
    createDisplayElement();
  }
  
  // 确保嵌套的设置对象存在，以防止错误
  settings.appearance = settings.appearance || {};
  settings.behavior = settings.behavior || {};
  settings.behavior.position = settings.behavior.position || {};
  settings.behavior.stealth = settings.behavior.stealth || {};
  
  const { appearance, behavior } = settings;
  
  // 从当前预设更新助手文本
  const currentPreset = getCurrentPreset();
  if (currentPreset && typeof currentPreset.text === 'string') {
    assistantText = currentPreset.text;
  } else {
    assistantText = (settings.presets && settings.presets[0]) ? settings.presets[0].text : '';
  }
  
  // 应用外观设置
  displayElement.style.fontSize = `${appearance.fontSize || 14}px`;
  displayElement.style.maxWidth = `${appearance.width || 300}px`;
  displayElement.style.backgroundColor = hexToRgba(appearance.backgroundColor || '#f0f0f0', appearance.opacity || 0.7);
  displayElement.style.color = appearance.textColor || '#000000';
  displayElement.style.borderLeftColor = appearance.borderColor || '#4285f4';
  
  // 应用行为设置
  displayElement.classList.toggle('mini-mode', !!behavior.miniMode);
  displayElement.classList.toggle('hover-visible', !!behavior.hoverMode);
  
  // 应用位置设置
  if (behavior.rememberPosition && behavior.position) {
    const pos = behavior.position;
    displayElement.style.top = pos.top || '10px';
    displayElement.style.left = pos.left || 'auto';
    displayElement.style.right = pos.right || '10px';
  } else {
    // 如果不记住位置，则重置为默认位置
    displayElement.style.top = '10px';
    displayElement.style.left = 'auto';
    displayElement.style.right = '10px';
  }
  
  updateDisplayText();
  setupAutoHide();
  applyStealthSettings();
}

// 应用隐蔽性设置 - 从applySettings中分离出来，增强错误隔离
function applyStealthSettings() {
  if (!displayElement || !settings || !settings.behavior || !settings.behavior.stealth) {
    return;
  }
  
  try {
    const stealth = settings.behavior.stealth;
    
    // 隐形模式
    if (stealth.stealthMode) {
      displayElement.classList.add('stealth-mode');
    } else {
      displayElement.classList.remove('stealth-mode');
    }
    
    // 无边框
    if (stealth.noBorder) {
      displayElement.classList.add('no-border');
    } else {
      displayElement.classList.remove('no-border');
    }
    
    // 超透明
    if (stealth.ultraTransparent) {
      displayElement.classList.add('ultra-transparent');
    } else {
      displayElement.classList.remove('ultra-transparent');
    }
    
    // 特殊隐蔽模式
    displayElement.classList.remove('ninja-mode', 'ghost-mode', 'micro-mode', 'text-only');
    if (stealth.stealthOption === 'ninja') {
      displayElement.classList.add('ninja-mode');
    } else if (stealth.stealthOption === 'ghost') {
      displayElement.classList.add('ghost-mode');
    } else if (stealth.stealthOption === 'micro') {
      displayElement.classList.add('micro-mode');
    } else if (stealth.stealthOption === 'text-only') {
      displayElement.classList.add('text-only');
    }
    
    // 环境融合
    if (stealth.blendIn) {
      displayElement.classList.add('blend-in');
    } else {
      displayElement.classList.remove('blend-in');
    }
    
    // 靠近屏幕边缘时淡出
    if (stealth.fadeNearEdge) {
      displayElement.classList.add('fade-near-edge');
      setupEdgeDetection();
    } else {
      displayElement.classList.remove('fade-near-edge', 'edge-fade');
    }
    
    // 智能自动定位
    if (stealth.autoPosition) {
      displayElement.classList.add('auto-position');
      setupAutoPositioning();
    } else {
      displayElement.classList.remove('auto-position');
    }
  } catch (error) {
    console.error("应用隐蔽性设置时出错:", error);
  }
}



// 将十六进制颜色转换为rgba
function hexToRgba(hex, opacity) {
  hex = hex.replace(/^#/, '');
  
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// 获取当前预设
function getCurrentPreset() {
  if (!settings || !settings.presets || !Array.isArray(settings.presets)) {
    return null;
  }
  
  const preset = settings.presets.find(preset => preset.id === settings.currentPresetId);
  
  // 如果找不到当前预设，则返回第一个预设或null
  return preset || (settings.presets.length > 0 ? settings.presets[0] : null);
}

// 更新显示文本
function updateDisplayText() {
  if (!displayElement || !settings) return;
  
  if (!assistantText || currentPosition >= assistantText.length) {
    displayElement.textContent = '已完成全部文本';
    return;
  }

  const previewLength = settings.appearance.previewLength || 15;
  const remainingText = assistantText.substring(currentPosition);
  const textToShow = remainingText.substring(0, previewLength);
  displayElement.textContent = textToShow + (remainingText.length > previewLength ? '...' : '');
}

// 设置自动隐藏
function setupAutoHide() {
  clearTimeout(autoHideTimer);
  
  if (!settings || !settings.behavior) {
    return;
  }
  
  if (settings.behavior.autoHide) {
    const hideDelay = (settings.behavior.hideDelay || 5) * 1000; // 转换为毫秒
    
    function startAutoHideTimer() {
      clearTimeout(autoHideTimer);
      autoHideTimer = setTimeout(() => {
        if (displayElement && isDocumentFocused) {
          displayElement.style.opacity = '0';
          displayElement.style.pointerEvents = 'none';
        }
      }, hideDelay);
    }
    
    // 当用户在页面上移动鼠标或点击时重置计时器
    document.addEventListener('mousemove', function() {
      if (displayElement) {
        displayElement.style.opacity = '';
        displayElement.style.pointerEvents = '';
        startAutoHideTimer();
      }
    });
    
    // 其他事件监听器...
    
    // 初始启动定时器
    startAutoHideTimer();
  }
}

// 显示辅助框
function showDisplay() {
  const display = createDisplayElement();
  display.style.display = 'block';
  applySettings();
}

// 隐藏辅助框
function hideDisplay() {
  if (displayElement) {
    displayElement.style.display = 'none';
  }
}

// 匹配文本
function matchInputText(inputText, expectedText) {
  if (!settings || !inputText || !expectedText) return false;
  
  const sensitivity = settings.advanced.matchSensitivity || 'moderate';
  
  if (sensitivity === 'strict') {
    // 严格匹配 - 必须完全相同
    return inputText.endsWith(expectedText);
  } else if (sensitivity === 'loose') {
    // 宽松匹配 - 忽略空格、大小写和标点
    const cleanInput = inputText.replace(/[\s\p{P}]/gu, '').toLowerCase();
    const cleanExpected = expectedText.replace(/[\s\p{P}]/gu, '').toLowerCase();
    return cleanInput.endsWith(cleanExpected);
  } else {
    // 适中匹配 - 忽略空格和大小写
    const cleanInput = inputText.replace(/\s+/g, '').toLowerCase();
    const cleanExpected = expectedText.replace(/\s+/g, '').toLowerCase();
    return cleanInput.endsWith(cleanExpected);
  }
}

// 处理文本前进
function advanceText(inputText) {
  if (!settings || !assistantText) return;
  
  const advanceMode = settings.advanced.advanceMode || 'auto';
  const remainingText = assistantText.substring(currentPosition);
  
  if (advanceMode === 'char') {
    // 逐字符前进
    const segment = assistantText.substring(currentPosition, currentPosition + 1);
    if (matchInputText(inputText, segment)) {
      currentPosition++;
      updateDisplayText();
    }
  } else if (advanceMode === 'word') {
    // 逐单词前进
    const nextSpace = remainingText.indexOf(' ');
    const segment = nextSpace > 0 ? remainingText.substring(0, nextSpace) : remainingText;
    
    if (matchInputText(inputText, segment)) {
      currentPosition += segment.length + (nextSpace > 0 ? 1 : 0); // +1 是为了跳过空格
      updateDisplayText();
    }
  } else {
    // 智能前进
    // 先尝试匹配短文本
    const shortSegment = remainingText.substring(0, 1);
    if (matchInputText(inputText, shortSegment)) {
      currentPosition++;
      updateDisplayText();
    }
    
    // 如果看起来像是粘贴的内容，则前进更多
    const mediumSegment = remainingText.substring(0, Math.min(10, remainingText.length));
    if (matchInputText(inputText, mediumSegment)) {
      currentPosition += mediumSegment.length;
      updateDisplayText();
    }
    
    // 检查更大块的匹配
    const longerSegment = remainingText.substring(0, Math.min(30, remainingText.length));
    if (matchInputText(inputText, longerSegment)) {
      currentPosition += longerSegment.length;
      updateDisplayText();
    }
  }
}

// 监听所有输入事件
document.addEventListener('input', function(e) {
  if (!settings || !settings.displayActive || !isDocumentFocused) return;

  const target = e.target;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    const inputValue = target.value;
    
    // 检查输入值是否与辅助文本的开头匹配。
    // 这种方法对单字符、多字符和粘贴的文本都有效。
    if (assistantText.startsWith(inputValue)) {
      // 如果匹配，则将当前位置更新为输入值的长度。
      currentPosition = inputValue.length;
    } else {
      // 如果不匹配（例如，由于拼写错误或删除），我们会找到
      // 当前输入中与辅助文本仍然匹配的最长前缀。
      let i = inputValue.length;
      while (i > 0 && !assistantText.startsWith(inputValue.substring(0, i))) {
        i--;
      }
      currentPosition = i;
    }
    
    updateDisplayText();
    setupAutoHide();
  }
});

// 监听来自弹出窗口或后台脚本的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // 如果扩展上下文已失效，则不执行任何操作以避免错误。
  if (!chrome.runtime || !chrome.runtime.id) {
    return;
  }

  switch (request.action) {
    case 'settingsUpdated':
      settings = request.settings;
      // 始终应用设置以更新内部状态（如助手文本）。
      applySettings();
      
      // 然后，根据新状态显示或隐藏。
      if (settings.displayActive) {
        showDisplay();
      } else {
        hideDisplay();
      }
      sendResponse({ status: '设置已由内容脚本接收并应用。' });
      break;
      
    case 'toggleDisplay':
      // 此消息来自后台脚本（快捷键），只包含新的状态。
      if (settings) {
        settings.displayActive = request.state;
      }
      if (request.state) {
        // 在显示之前应用设置，以确保所有内容都是最新的。
        applySettings();
        showDisplay();
      } else {
        hideDisplay();
      }
      sendResponse({ status: '显示状态已由内容脚本切换。' });
      break;
  }
  
  return true; // 表示将异步发送响应。
});

/**
 * 更新助手文本并重置位置 
 * @param {string} text - 要显示的新文本
 * @return {boolean} - 更新是否成功
 */
function updateAssistantText(text) {
  if (typeof text !== 'string') return false;
  assistantText = text;
  currentPosition = 0;
  updateDisplayText();
  return true;
}

// 监听窗口焦点变化
window.addEventListener('focus', function() {
  isDocumentFocused = true;
});

window.addEventListener('blur', function() {
  isDocumentFocused = false;
});

// 页面加载时初始化
window.addEventListener('load', function() {
  // 延迟初始化以确保页面完全加载
  setTimeout(initializeSettings, 100);
});

// 设置边缘检测
function setupEdgeDetection() {
  if (!displayElement) return;
  
  function checkEdgeProximity() {
    const rect = displayElement.getBoundingClientRect();
    const threshold = 30; // 距离边缘的阈值（像素）
    
    const nearEdge = (
      rect.left < threshold || 
      rect.top < threshold || 
      window.innerWidth - rect.right < threshold || 
      window.innerHeight - rect.bottom < threshold
    );
    
    if (nearEdge) {
      displayElement.classList.add('edge-fade');
    } else {
      displayElement.classList.remove('edge-fade');
    }
  }
  
  // 监听鼠标移动来检测边缘接近情况
  document.addEventListener('mousemove', checkEdgeProximity);
  
  // 初始检查
  checkEdgeProximity();
}

// 设置智能自动定位
function setupAutoPositioning() {
  if (!displayElement) return;
  
  function repositionElement(e) {
    // 避免跟随光标太密切，只在鼠标移动较多时调整位置
    if (!lastMousePosition || 
        Math.abs(e.clientX - lastMousePosition.x) > 200 || 
        Math.abs(e.clientY - lastMousePosition.y) > 200) {
      
      // 计算新位置
      let newTop, newLeft;
      
      // 水平位置 - 避开鼠标区域
      if (e.clientX < window.innerWidth / 2) {
        // 鼠标在左侧，将提示框放在右侧
        newLeft = 'auto';
        displayElement.style.right = '10px';
      } else {
        // 鼠标在右侧，将提示框放在左侧
        newLeft = '10px';
        displayElement.style.right = 'auto';
      }
      
      // 垂直位置 - 避开鼠标区域
      if (e.clientY < window.innerHeight / 2) {
        // 鼠标在上半部分，将提示框放在下方
        newTop = (window.innerHeight - 100) + 'px';
      } else {
        // 鼠标在下半部分，将提示框放在上方
        newTop = '10px';
      }
      
      // 应用新位置
      displayElement.style.top = newTop;
      if (newLeft !== 'auto') {
        displayElement.style.left = newLeft;
      }
      
      lastMousePosition = { x: e.clientX, y: e.clientY };
    }
  }
  
  // 存储上一次的鼠标位置
  let lastMousePosition = null;
  
  // 监听鼠标移动
  document.addEventListener('mousemove', repositionElement);
}
