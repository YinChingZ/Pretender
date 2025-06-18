document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const textInput = document.getElementById('text-input');
  const presetName = document.getElementById('preset-name');
  const presetSelect = document.getElementById('preset-select');
  const newPresetBtn = document.getElementById('new-preset');
  const deletePresetBtn = document.getElementById('delete-preset');
  const saveButton = document.getElementById('save-button');
  const toggleButton = document.getElementById('toggle-display');
  const statusMessage = document.getElementById('status-message');
  
  // 外观设置元素
  const opacityRange = document.getElementById('opacity-range');
  const opacityValue = document.getElementById('opacity-value');
  const fontSizeInput = document.getElementById('font-size');
  const previewLengthInput = document.getElementById('preview-length');
  const widthSettingInput = document.getElementById('width-setting');
  const textColorPicker = document.getElementById('text-color');
  const bgColorPicker = document.getElementById('bg-color');
  const borderColorPicker = document.getElementById('border-color');
  
  // 行为设置元素
  const rememberPositionCheckbox = document.getElementById('remember-position');
  const resetPositionBtn = document.getElementById('reset-position');
  const autoHideCheckbox = document.getElementById('auto-hide');
  const hideDelayInput = document.getElementById('hide-delay');
  const hoverModeCheckbox = document.getElementById('hover-mode');
  const miniModeCheckbox = document.getElementById('mini-mode');
  const stealthModeCheckbox = document.getElementById('stealth-mode');
  const noBorderCheckbox = document.getElementById('no-border');
  const ultraTransparentCheckbox = document.getElementById('ultra-transparent');
  
  // 高级设置元素
  const matchSensitivitySelect = document.getElementById('match-sensitivity');
  const advanceModeSelect = document.getElementById('advance-mode');
  const exportSettingsBtn = document.getElementById('export-settings');
  const importSettingsBtn = document.getElementById('import-settings');
  const importFileInput = document.getElementById('import-file');
  const resetSettingsBtn = document.getElementById('reset-settings');
  
  // 标签页切换
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(button.dataset.tab + '-tab').classList.add('active');
    });
  });

  // 从 background.js 复制的默认设置，用于重置功能
  const defaultSettingsForReset = {
    displayActive: false,
    presets: [{ id: 'default', name: '默认文本', text: '这是一个示例文本。您可以在此输入任何您需要的内容。' }],
    currentPresetId: 'default',
    appearance: { opacity: 0.7, fontSize: 14, previewLength: 15, width: 300, textColor: '#000000', backgroundColor: '#f0f0f0', borderColor: '#4285f4' },
    behavior: {
      autoHide: false, hideDelay: 5, hoverMode: false, miniMode: false, rememberPosition: true,
      position: { top: '10px', left: 'auto', right: '10px' },
      stealth: { stealthMode: false, noBorder: false, ultraTransparent: false, stealthOption: 'none', blendIn: false, fadeNearEdge: false, autoPosition: false }
    },
    advanced: { matchSensitivity: 'moderate', advanceMode: 'auto' }
  };

  let currentSettings = {};

  // 加载设置
  function loadSettings() {
    chrome.storage.local.get(['settings'], function(result) {
      if (result.settings) {
        currentSettings = result.settings;
        updatePresetsDropdown();
        loadCurrentPreset();
        updateSettingsUI();
        updateToggleButton();
      } else {
        showStatus('错误：无法加载设置，请尝试重装插件。', true);
      }
    });
  }

  // 更新UI以匹配当前设置
  function updateSettingsUI() {
    if (!currentSettings || Object.keys(currentSettings).length === 0) return;

    // 健壮性检查：确保嵌套对象存在
    currentSettings.appearance = currentSettings.appearance || defaultSettingsForReset.appearance;
    currentSettings.behavior = currentSettings.behavior || defaultSettingsForReset.behavior;
    currentSettings.behavior.stealth = currentSettings.behavior.stealth || defaultSettingsForReset.behavior.stealth;
    currentSettings.advanced = currentSettings.advanced || defaultSettingsForReset.advanced;

    const { appearance, behavior, advanced } = currentSettings;
    const { stealth } = behavior;

    // 更新外观UI
    opacityRange.value = appearance.opacity;
    opacityValue.textContent = `${Math.round(appearance.opacity * 100)}%`;
    fontSizeInput.value = appearance.fontSize;
    previewLengthInput.value = appearance.previewLength;
    widthSettingInput.value = appearance.width;
    textColorPicker.value = appearance.textColor;
    bgColorPicker.value = appearance.backgroundColor;
    borderColorPicker.value = appearance.borderColor;

    // 更新行为UI
    rememberPositionCheckbox.checked = behavior.rememberPosition;
    autoHideCheckbox.checked = behavior.autoHide;
    hideDelayInput.value = behavior.hideDelay;
    hideDelayInput.disabled = !behavior.autoHide;
    hoverModeCheckbox.checked = behavior.hoverMode;
    miniModeCheckbox.checked = behavior.miniMode;
    
    // 更新隐蔽性UI
    stealthModeCheckbox.checked = stealth.stealthMode;
    noBorderCheckbox.checked = stealth.noBorder;
    ultraTransparentCheckbox.checked = stealth.ultraTransparent;

    // 更新高级UI
    matchSensitivitySelect.value = advanced.matchSensitivity;
    advanceModeSelect.value = advanced.advanceMode;
  }

  // 更新预设下拉菜单
  function updatePresetsDropdown() {
    presetSelect.innerHTML = '';
    if (currentSettings.presets) {
      currentSettings.presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.name;
        if (preset.id === currentSettings.currentPresetId) {
          option.selected = true;
        }
        presetSelect.appendChild(option);
      });
    }
  }

  // 加载当前预设
  function loadCurrentPreset() {
    const preset = getCurrentPreset();
    if (preset) {
      textInput.value = preset.text;
      presetName.value = preset.name;
    } else {
      textInput.value = '';
      presetName.value = '';
    }
  }

  // 获取当前预设 (增强健壮性)
  function getCurrentPreset() {
    if (!currentSettings || !currentSettings.presets || !Array.isArray(currentSettings.presets)) {
      return null;
    }
    const preset = currentSettings.presets.find(p => p.id === currentSettings.currentPresetId);
    return preset || (currentSettings.presets.length > 0 ? currentSettings.presets[0] : null);
  }

  // 保存设置到 chrome.storage
  function saveSettings() {
    chrome.storage.local.set({ 'settings': currentSettings }, function() {
      notifyContentScript();
    });
  }

  // 向内容脚本发送更新消息
  function notifyContentScript() {
    chrome.runtime.sendMessage({
      action: "forwardToActiveTab",
      message: { action: "settingsUpdated", settings: currentSettings }
    }, response => {
      if (chrome.runtime.lastError) {
        // 在无法连接到内容脚本的页面（如 chrome://...）上，这属于正常现象
        // console.log('Could not send settings to content script:', chrome.runtime.lastError.message);
      }
    });
  }

  // 显示状态消息
  function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? '#f44336' : '#4CAF50';
    setTimeout(() => {
      statusMessage.textContent = '';
    }, 3000);
  }

  // 更新当前预设的文本和名称
  function updateCurrentPreset() {
    const preset = getCurrentPreset();
    if (preset) {
      preset.text = textInput.value;
      preset.name = presetName.value || '未命名预设';
      return true;
    }
    return false;
  }

  // 生成唯一ID
  function generateId() {
    return 'preset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // --- 事件监听器 ---

  // 预设管理
  presetSelect.addEventListener('change', function() {
    currentSettings.currentPresetId = this.value;
    loadCurrentPreset();
    saveSettings();
  });

  newPresetBtn.addEventListener('click', function() {
    const newId = generateId();
    const newPreset = { id: newId, name: '新预设', text: '' };
    currentSettings.presets.push(newPreset);
    currentSettings.currentPresetId = newId;
    updatePresetsDropdown();
    loadCurrentPreset();
    saveSettings();
    presetName.focus();
  });

  deletePresetBtn.addEventListener('click', function() {
    if (currentSettings.presets.length <= 1) {
      showStatus('不能删除最后一个预设', true);
      return;
    }
    if (confirm(`确定要删除预设 "${getCurrentPreset().name}" 吗？`)) {
      currentSettings.presets = currentSettings.presets.filter(p => p.id !== currentSettings.currentPresetId);
      currentSettings.currentPresetId = currentSettings.presets[0].id;
      updatePresetsDropdown();
      loadCurrentPreset();
      saveSettings();
      showStatus('预设已删除');
    }
  });

  // 主要操作
  saveButton.addEventListener('click', function() {
    if (updateCurrentPreset()) {
      saveSettings();
      updatePresetsDropdown(); // 名称可能已更改
      showStatus('文本已保存！');
    } else {
      showStatus('没有活动的预设可保存', true);
    }
  });

  function updateToggleButton() {
    toggleButton.textContent = currentSettings.displayActive ? '隐藏辅助' : '显示辅助';
  }

  toggleButton.addEventListener('click', function() {
    currentSettings.displayActive = !currentSettings.displayActive;
    saveSettings();
    updateToggleButton();
  });

  // 外观设置
  opacityRange.addEventListener('input', function() {
    opacityValue.textContent = `${Math.round(this.value * 100)}%`;
    currentSettings.appearance.opacity = parseFloat(this.value);
    saveSettings();
  });

  fontSizeInput.addEventListener('change', function() {
    currentSettings.appearance.fontSize = parseInt(this.value, 10);
    saveSettings();
  });

  previewLengthInput.addEventListener('change', function() {
    currentSettings.appearance.previewLength = parseInt(this.value, 10);
    saveSettings();
  });

  widthSettingInput.addEventListener('change', function() {
    currentSettings.appearance.width = parseInt(this.value, 10);
    saveSettings();
  });

  textColorPicker.addEventListener('change', function() {
    currentSettings.appearance.textColor = this.value;
    saveSettings();
  });

  bgColorPicker.addEventListener('change', function() {
    currentSettings.appearance.backgroundColor = this.value;
    saveSettings();
  });

  borderColorPicker.addEventListener('change', function() {
    currentSettings.appearance.borderColor = this.value;
    saveSettings();
  });

  // 行为设置
  rememberPositionCheckbox.addEventListener('change', function() {
    currentSettings.behavior.rememberPosition = this.checked;
    saveSettings();
  });

  resetPositionBtn.addEventListener('click', function() {
    currentSettings.behavior.position = { ...defaultSettingsForReset.behavior.position };
    saveSettings();
    showStatus('位置已重置');
  });

  autoHideCheckbox.addEventListener('change', function() {
    currentSettings.behavior.autoHide = this.checked;
    hideDelayInput.disabled = !this.checked;
    saveSettings();
  });

  hideDelayInput.addEventListener('change', function() {
    currentSettings.behavior.hideDelay = parseInt(this.value, 10);
    saveSettings();
  });

  hoverModeCheckbox.addEventListener('change', function() {
    currentSettings.behavior.hoverMode = this.checked;
    saveSettings();
  });

  miniModeCheckbox.addEventListener('change', function() {
    currentSettings.behavior.miniMode = this.checked;
    saveSettings();
  });

  // 隐蔽性设置
  stealthModeCheckbox.addEventListener('change', function() {
    currentSettings.behavior.stealth.stealthMode = this.checked;
    saveSettings();
  });

  noBorderCheckbox.addEventListener('change', function() {
    currentSettings.behavior.stealth.noBorder = this.checked;
    saveSettings();
  });

  ultraTransparentCheckbox.addEventListener('change', function() {
    currentSettings.behavior.stealth.ultraTransparent = this.checked;
    saveSettings();
  });

  // 高级设置
  matchSensitivitySelect.addEventListener('change', function() {
    currentSettings.advanced.matchSensitivity = this.value;
    saveSettings();
  });

  advanceModeSelect.addEventListener('change', function() {
    currentSettings.advanced.advanceMode = this.value;
    saveSettings();
  });

  resetSettingsBtn.addEventListener('click', function() {
    if (confirm('您确定要恢复所有默认设置吗？此操作不可撤销。')) {
      currentSettings = JSON.parse(JSON.stringify(defaultSettingsForReset));
      saveSettings();
      // 重新加载整个UI
      updatePresetsDropdown();
      loadCurrentPreset();
      updateSettingsUI();
      updateToggleButton();
      showStatus('所有设置已恢复为默认值');
    }
  });

  exportSettingsBtn.addEventListener('click', function() {
    const settingsString = JSON.stringify(currentSettings, null, 2);
    const blob = new Blob([settingsString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'text-assistant-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus('设置已导出');
  });

  importSettingsBtn.addEventListener('click', function() {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const importedSettings = JSON.parse(e.target.result);
          // 在此可以添加更复杂的验证逻辑
          if (importedSettings && importedSettings.presets && importedSettings.appearance) {
            currentSettings = importedSettings;
            saveSettings();
            // 重新加载整个UI
            updatePresetsDropdown();
            loadCurrentPreset();
            updateSettingsUI();
            updateToggleButton();
            showStatus('设置已成功导入');
          } else {
            showStatus('导入失败：文件内容无效。', true);
          }
        } catch (err) {
          showStatus('导入失败：文件格式错误。', true);
        }
      };
      reader.readAsText(file);
    }
    // 重置input，以便可以再次选择相同的文件
    event.target.value = '';
  });

  // 初始化
  loadSettings();
});