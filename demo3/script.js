// 全局变量
let plugins = {};
let groups = {};
let apps = {};
let metadata = {}; // 完全清空，包括key和value
let appConfigs = {}; // 应用配置数据

let currentAppId = null;
let currentGlobalConfig = null;
let currentAppConfigType = 'pluginGroups'; // 当前应用配置类型：pluginGroups, plugins, routes

let appEditor = null;
let globalConfigEditor = null;

// 加载全局配置
async function loadGlobalConfig(configType, event) {
    // 如果有事件对象，立即阻止默认行为
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log('loadGlobalConfig called with configType:', configType);
    console.log('globalConfigEditor:', globalConfigEditor);
    console.log('groups data:', groups);
    console.log('plugins data:', plugins);
    console.log('metadata data:', metadata);
    
    // 如果当前已经选中该配置类型，不做任何操作
    if (currentGlobalConfig === configType) {
        return false;
    }
    
    // 使用统一的检测函数检查未保存内容
    if (currentGlobalConfig) {
        const canContinue = await checkUnsavedChanges('当前内容有未保存的更改，是否继续切换？');
        if (!canContinue) {
            return false; // 用户取消切换，不执行后续代码
        }
    }
    
    let configTitle = '';
    let configData = {};
    
    // 确保数据已加载
    console.log('加载全局配置:', configType);
    console.log('当前groups数据:', groups);
    console.log('当前plugins数据:', plugins);
    
    switch(configType) {
        case 'plugin-group':
            configTitle = '插件组配置';
            configData = groups || {}; // 确保有默认值
            console.log('Using groups data:', configData);
            break;
        case 'plugin':
            configTitle = '插件配置';
            configData = plugins || {}; // 确保有默认值
            console.log('Using plugins data:', configData);
            break;
        case 'plugin-metadata':
            configTitle = '插件元数据配置';
            configData = metadata || {}; // 确保有默认值
            console.log('Using metadata data:', configData);
            break;
    }
    
    // 更新当前全局配置类型
    currentGlobalConfig = configType;
    
    // 更新标题
    document.getElementById('global-config-title').textContent = configTitle;
    
    // 更新编辑器内容
    if (globalConfigEditor) {
        // 强制重置编辑器内容和状态
        globalConfigEditor.setValue("");
        globalConfigEditor.getModel().setValue("");  // 确保模型也被重置
        
        // 设置新内容
        const jsonString = JSON.stringify(configData, null, 2);
        console.log('Setting editor content:', jsonString.substring(0, 100) + '...');
        
        // 使用requestAnimationFrame确保DOM更新后再设置内容
        requestAnimationFrame(() => {
            globalConfigEditor.setValue(jsonString);
            globalConfigEditor.getModel().setValue(jsonString);  // 确保模型内容也被设置
            globalConfigEditor.layout();
            globalConfigEditor.focus();
            
            // 将光标移动到开始位置
            globalConfigEditor.setPosition({lineNumber: 1, column: 1});
            
            // 清除编辑器的撤销历史，防止之前的修改被恢复
            globalConfigEditor.getModel().pushStackElement();
            
            console.log(`已更新全局编辑器内容，配置类型: ${configType}`);
            console.log('Editor content set successfully');
        });
    } else {
        console.error('globalConfigEditor 未初始化');
    }
}

// 保存全局配置
function saveGlobalConfig() {
    try {
        const configData = JSON.parse(globalConfigEditor.getValue());
        
        switch(currentGlobalConfig) {
            case 'plugin-group':
                groups = configData;
                break;
            case 'plugin':
                plugins = configData;
                break;
            case 'plugin-metadata':
                metadata = configData;
                break;
        }
        
        // 保存到本地存储
        localStorage.setItem('groups', JSON.stringify(groups));
        localStorage.setItem('plugins', JSON.stringify(plugins));
        localStorage.setItem('metadata', JSON.stringify(metadata));
        
        showToast('保存成功');
    } catch (e) {
        showToast('保存失败：' + e.message, 'error');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initEventListeners();
    // 先加载数据，确保groups等数据已加载
    loadData().then(() => {
        // 然后初始化编辑器
        initEditors();
        // 初始化应用类型切换
        initAppTypeTabs();
        // 初始化应用配置标签切换
        initAppConfigTabs();
        
        // 最后加载全局配置内容，确保数据已经完全加载
        setTimeout(() => {
            loadGlobalConfig('plugin-group');
        }, 100); // 添加短暂延迟确保编辑器完全初始化
    });
    
    // 添加页面关闭/刷新时的未保存检测
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges()) {
            // 显示确认对话框
            e.preventDefault();
            e.returnValue = '当前有未保存的更改，确定要离开吗？';
            return e.returnValue;
        }
    });
    
    // 添加页面关闭/刷新时的未保存检测
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges()) {
            // 显示确认对话框
            e.preventDefault();
            e.returnValue = '当前有未保存的更改，确定要离开吗？';
            return e.returnValue;
        }
    });
});

// 初始化标签页切换
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', async (event) => {
            // 检查是否有未保存的更改
            if (hasUnsavedChanges()) {
                const canContinue = await checkUnsavedChanges('当前内容有未保存的更改，是否继续切换？');
                if (!canContinue) {
                    return; // 用户选择取消，不进行切换
                }
            }
            
            performTabSwitch(btn, tabBtns, tabPanes);
        });
    });
}

function performTabSwitch(btn, tabBtns, tabPanes) {
    const tabId = btn.dataset.tab;
    
    // 在切换前，如果有未保存的更改，恢复编辑器内容到原始状态
    if (hasUnsavedChanges()) {
        resetEditorsToOriginalState();
    }
    
    // 移除所有活动状态
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));
    
    // 设置当前标签为活动状态
    btn.classList.add('active');
    document.getElementById(tabId).classList.add('active');
    
    // 使用requestAnimationFrame确保DOM更新完成后再进行编辑器操作
    requestAnimationFrame(() => {
        // 重置当前状态变量，避免状态混乱
        // 注意：这里重置状态变量是为了确保未保存检测的准确性
        if (tabId === 'global-config-tab') {
            currentAppId = null;
            // 切换到全局配置标签后，重新加载当前全局配置内容
            if (currentGlobalConfig) {
                loadGlobalConfig(currentGlobalConfig);
            } else {
                // 如果没有当前全局配置，加载默认的插件组配置
                loadGlobalConfig('plugin-group');
            }
        } else if (tabId === 'app-tab') {
            currentGlobalConfig = null;
            // 切换到应用配置标签后，重新加载应用配置内容
            if (currentAppId) {
                updateAppEditorContent();
            } else {
                // 如果没有选中应用，自动选择第一个应用
                if (apps && apps.web && apps.web.length > 0) {
                    // 自动选择第一个Web应用
                    loadApp('web-0', 'web', 0);
                } else {
                    // 如果没有应用数据，显示提示信息
                    if (appEditor) {
                        appEditor.setValue("");
                        appEditor.getModel().setValue("");
                        appEditor.getModel().pushStackElement();
                        
                        // 设置提示信息
                        const hintMessage = "// 暂无可用的应用";
                        appEditor.setValue(hintMessage);
                        appEditor.getModel().setValue(hintMessage);
                        appEditor.getModel().pushStackElement();
                        
                        // 重置光标位置
                        appEditor.setPosition({lineNumber: 1, column: 1});
                    }
                }
            }
        }
    });
}

// 恢复编辑器内容到原始状态
function resetEditorsToOriginalState() {
    // 恢复全局配置编辑器
    if (currentGlobalConfig && globalConfigEditor) {
        let originalContent;
        switch(currentGlobalConfig) {
            case 'plugin-group':
                originalContent = groups;
                break;
            case 'plugin':
                originalContent = plugins;
                break;
            case 'plugin-metadata':
                originalContent = metadata;
                break;
            default:
                originalContent = null;
        }
        
        if (originalContent) {
            // 彻底清除编辑器状态
            globalConfigEditor.setValue("");
            globalConfigEditor.getModel().setValue("");
            
            // 设置原始内容
            const jsonString = JSON.stringify(originalContent, null, 2);
            globalConfigEditor.setValue(jsonString);
            globalConfigEditor.getModel().setValue(jsonString);
            
            // 清除撤销历史
            globalConfigEditor.getModel().pushStackElement();
            
            // 重置光标位置
            globalConfigEditor.setPosition({lineNumber: 1, column: 1});
        }
    }
    
    // 恢复应用配置编辑器
    if (currentAppId && appEditor) {
        const app = apps[currentAppId];
        if (app && app.config && app.config[currentAppConfigType]) {
            const originalContent = app.config[currentAppConfigType];
            
            // 彻底清除编辑器状态
            appEditor.setValue("");
            appEditor.getModel().setValue("");
            
            // 设置原始内容
            const jsonString = JSON.stringify(originalContent, null, 2);
            appEditor.setValue(jsonString);
            appEditor.getModel().setValue(jsonString);
            
            // 清除撤销历史
            appEditor.getModel().pushStackElement();
            
            // 重置光标位置
            appEditor.setPosition({lineNumber: 1, column: 1});
        }
    }
}

// 初始化编辑器
function initEditors() {
    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.36.1/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        // 创建应用编辑器 - 初始值将在选择应用后通过updateAppEditorContent设置
        appEditor = monaco.editor.create(document.getElementById('app-editor'), {
            value: '',
            language: 'json',
            theme: 'vs',
            automaticLayout: true,
            minimap: { enabled: false }
        });
        
        // 创建全局配置编辑器 - 初始值将在数据加载完成后设置
        globalConfigEditor = monaco.editor.create(document.getElementById('global-editor'), {
            value: '',
            language: 'json',
            theme: 'vs',
            automaticLayout: true,
            minimap: { enabled: false }
        });
        
        // 不在这里调用loadGlobalConfig，等待数据加载完成后再调用
    });
}

// 格式化JSON
function formatJSON(editor) {
    try {
        const currentValue = editor.getValue();
        const jsonObj = JSON.parse(currentValue);
        const formattedJSON = JSON.stringify(jsonObj, null, 2);
        editor.setValue(formattedJSON);
    } catch (e) {
        alert('JSON格式错误，无法格式化');
    }
}

// 初始化应用类型切换
// 由于WEB应用现在是标题样式，不再需要初始化应用类型标签
function initAppTypeTabs() {
    // 显示WEB应用列表
    document.getElementById('web-app-container').classList.add('active');
    
    // 应用当前的搜索和筛选
    handleSearchFilter();
}

// 检查是否有未保存的更改
function hasUnsavedChanges() {
    // 检查应用配置编辑器
    if (currentAppId && appEditor) {
        try {
            const currentContent = JSON.parse(appEditor.getValue());
            const app = apps[currentAppId];
            
            if (app && app.config && app.config[currentAppConfigType]) {
                const savedContent = app.config[currentAppConfigType];
                if (JSON.stringify(currentContent) !== JSON.stringify(savedContent)) {
                    return true;
                }
            }
        } catch (e) {
            // 如果JSON解析失败，认为有未保存的更改
            return true;
        }
    }
    
    // 检查全局配置编辑器
    if (currentGlobalConfig && globalConfigEditor) {
        try {
            const currentContent = JSON.parse(globalConfigEditor.getValue());
            let savedContent;
            
            switch(currentGlobalConfig) {
                case 'plugin-group':
                    savedContent = groups;
                    break;
                case 'plugin':
                    savedContent = plugins;
                    break;
                case 'plugin-metadata':
                    savedContent = metadata;
                    break;
                default:
                    savedContent = null;
            }
            
            // 确保savedContent不为null再进行比较
            if (savedContent && JSON.stringify(currentContent) !== JSON.stringify(savedContent)) {
                return true;
            }
        } catch (e) {
            // 如果JSON解析失败，认为有未保存的更改
            return true;
        }
    }
    
    return false;
}

// 统一的未保存内容检测函数
function checkUnsavedChanges(message) {
    // 默认提示消息
    const promptMessage = message || '当前内容有未保存的更改，是否继续切换？';
    
    // 如果有未保存的更改，使用自定义对话框
    if (hasUnsavedChanges()) {
        // 创建一个Promise来处理异步对话框
        return new Promise((resolve) => {
            showDialog('确认操作', 'confirm', promptMessage, () => {
                hideDialog();
                resolve(true); // 用户点击确认
            });
            
            // 添加取消按钮的事件处理
            const cancelButton = document.querySelector('#dialog .btn-secondary');
            if (cancelButton) {
                cancelButton.onclick = () => {
                    hideDialog();
                    resolve(false); // 用户点击取消
                };
            }
        });
    }
    
    // 如果没有未保存的更改，直接返回Promise.resolve(true)允许操作
    return Promise.resolve(true);
}

// 初始化应用配置标签切换
function initAppConfigTabs() {
    const configTabBtns = document.querySelectorAll('.config-tab-btn');
    
    configTabBtns.forEach(btn => {
        btn.addEventListener('click', async function(event) {
            // 先阻止默认行为，确保在检查未保存内容前不会执行切换
            event.preventDefault();
            event.stopPropagation();
            
            // 如果当前标签已经是活动状态，不做任何操作
            if (this.classList.contains('active')) {
                return;
            }
            
            // 使用统一的检测函数检查未保存内容
            const canContinue = await checkUnsavedChanges('当前内容有未保存的更改，是否继续切换？');
            if (currentAppId && !canContinue) {
                return; // 用户取消切换，不执行后续代码
            }
            
            // 用户确认切换或没有未保存内容，手动执行切换逻辑
            
            // 移除所有活动状态
            configTabBtns.forEach(b => b.classList.remove('active'));
            
            // 设置当前标签为活动状态
            this.classList.add('active');
            currentAppConfigType = this.dataset.config;
            
            // 如果有选中的应用，更新编辑器内容
            if (currentAppId) {
                updateAppEditorContent();
            }
        });
    });
}

// 更新应用编辑器内容
function updateAppEditorContent() {
    if (!currentAppId || !appEditor) return;
    
    // 从currentAppId解析应用类型和索引
    const parts = currentAppId.split('-');
    const appType = parts[0]; // web 或 tunnel
    const index = parseInt(parts[1]);
    
    // 从应用数据和配置数据中获取信息
    const appData = apps[appType] ? apps[appType][index] : null;
    const appConfigData = appConfigs[appType] ? appConfigs[appType].find(c => c.id === currentAppId) : null;
    
    if (!appData) {
        console.error('找不到应用数据:', currentAppId);
        return;
    }
    
    // 如果找不到配置数据，创建一个新的配置对象
    if (!appConfigData) {
        console.log('找不到应用配置，创建新配置:', currentAppId);
        if (!appConfigs[appType]) {
            appConfigs[appType] = [];
        }
        
        appConfigs[appType].push({
            id: currentAppId,
            config: {
                pluginGroups: {},
                plugins: {},
                routes: {}
            }
        });
    }
    
    // 确保app.config对象存在并与appConfigs同步
    if (!appData.config) {
        appData.config = {
            pluginGroups: {},
            plugins: {},
            routes: {}
        };
    }
    
    // 重新获取配置数据
    const configData = appConfigs[appType].find(c => c.id === currentAppId);
    
    // 确保配置对象存在
    if (!configData.config) {
        configData.config = {
            pluginGroups: {},
            plugins: {},
            routes: {}
        };
    }
    
    // 确保各配置对象存在，默认为空对象
    if (!configData.config.pluginGroups) configData.config.pluginGroups = {};
    if (!configData.config.plugins) configData.config.plugins = {};
    if (!configData.config.routes) configData.config.routes = {};
    
    // 同步app.config和configData.config
    appData.config = JSON.parse(JSON.stringify(configData.config));
    
    // 根据当前选中的配置类型更新编辑器内容
    let editorContent = configData.config[currentAppConfigType] || {};
    
    // 强制重置编辑器内容和状态
    appEditor.setValue("");
    appEditor.getModel().setValue("");  // 确保模型也被重置
    
    // 使用requestAnimationFrame确保DOM更新后再设置内容
    requestAnimationFrame(() => {
        const newContent = JSON.stringify(editorContent, null, 2);
        appEditor.setValue(newContent);
        appEditor.getModel().setValue(newContent);  // 确保模型内容也被设置
        appEditor.layout();
        appEditor.focus();
        
        // 将光标移动到开始位置
        appEditor.setPosition({lineNumber: 1, column: 1});
        
        // 清除编辑器的撤销历史，防止之前的修改被恢复
        appEditor.getModel().pushStackElement();
        
        console.log(`已更新编辑器内容，应用: ${currentAppId}, 配置类型: ${currentAppConfigType}`);
    });
}

// 处理搜索和筛选
function handleSearchFilter() {
    const searchTerm = document.getElementById('app-search').value.trim();
    const filterType = document.getElementById('app-filter').value;
    
    // 更新应用列表，应用搜索和筛选条件
    updateAppList(searchTerm, filterType);
}

// 初始化事件监听器
function initEventListeners() {
    // 应用相关事件
    document.getElementById('save-app')?.addEventListener('click', saveApp);
    document.getElementById('reset-app')?.addEventListener('click', async (event) => await loadApp(currentAppId, null, null, event));
    document.getElementById('apply-group-to-app')?.addEventListener('click', applyGroupToCurrentApp);
    document.getElementById('format-app')?.addEventListener('click', () => formatJSON(appEditor));
    
    // 搜索和筛选事件
    document.getElementById('app-search')?.addEventListener('input', handleSearchFilter);
    document.getElementById('app-filter')?.addEventListener('change', handleSearchFilter);
    
    // 移除插件组应用到应用的事件
    document.getElementById('remove-group-from-app')?.addEventListener('click', removeGroupFromCurrentApp);
    
    // 应用tab的事件
    document.getElementById('plugin-group-dropdown')?.addEventListener('change', handlePluginGroupChange);
    document.getElementById('apply-plugin-group')?.addEventListener('click', applyPluginGroupToSelectedApps);
    document.getElementById('reset-selection')?.addEventListener('click', resetAppSelection);
    
    // 应用类型切换事件
    document.querySelectorAll('input[name="app-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            toggleAppSelectionLists(e.target.value);
        });
    });
    
    // 全局配置相关事件
    document.getElementById('save-global-config')?.addEventListener('click', saveGlobalConfig);
    document.getElementById('reset-global-config')?.addEventListener('click', async (event) => await loadGlobalConfig(currentGlobalConfig, event));
    document.getElementById('format-global-config')?.addEventListener('click', () => formatJSON(globalConfigEditor));
    
    // 全局配置列表项点击事件
    const configItems = document.querySelectorAll('#config-list .item');
    configItems.forEach(item => {
        item.addEventListener('click', async (event) => {
            // 立即阻止默认行为
            event.preventDefault();
            event.stopPropagation();
            
            // 加载对应配置
            const result = await loadGlobalConfig(item.dataset.config, event);
            if (result === false) return; // 用户取消切换
            
            // 移除所有活动状态
            configItems.forEach(i => i.classList.remove('active'));
            // 设置当前项为活动状态
            item.classList.add('active');
            // 更新当前配置类型
            currentGlobalConfig = item.dataset.config;
        });
    });
    
    // 对话框相关事件
    document.getElementById('dialog-close')?.addEventListener('click', hideDialog);
    document.getElementById('dialog-cancel')?.addEventListener('click', hideDialog);
    document.getElementById('dialog-confirm')?.addEventListener('click', confirmDialog);
}

// 加载数据
function loadData() {
    console.log('loadData function called');
    // 重置当前应用ID，确保刷新页面时能重新加载
    currentAppId = null;
    
    // 返回Promise.all，确保所有数据加载完成
    return Promise.all([
        // 加载插件数据
        fetch('../data/plugins.json')
            .then(response => {
                console.log('plugins.json response:', response);
                return response.json();
            })
            .then(data => {
                plugins = data;
                console.log('plugins data loaded:', plugins);
                // 插件数据已加载，但不再单独显示在编辑器中
            })
            .catch(error => {
                console.error('加载插件数据失败:', error);
                showToast('加载插件数据失败', 'error');
            }),
        
        // 加载插件组数据
        fetch('../data/plugins-groups.json')
            .then(response => {
                console.log('plugins-groups.json response:', response);
                return response.json();
            })
            .then(data => {
                groups = data;
                console.log('groups data loaded:', groups);
                // 插件组数据已加载，不再单独显示在编辑器中
            })
            .catch(error => {
                console.error('加载插件组数据失败:', error);
                showToast('加载插件组数据失败', 'error');
            }),
        
        // 加载应用配置数据
        fetch('../data/app-configs.json')
            .then(response => response.json())
            .then(data => {
                appConfigs = data;
                console.log('应用配置数据已加载:', appConfigs);
            })
            .catch(error => {
                console.error('加载应用配置数据失败:', error);
                showToast('加载应用配置数据失败', 'error');
                // 创建空的应用配置对象
                appConfigs = { web: [], tunnel: [] };
            }),
        
        // 加载应用数据
        fetch('../data/aplications.json')
            .then(response => response.json())
            .then(data => {
                apps = data;
                updateAppList();
                
                // 数据加载完成后，自动选择第一个应用
                if (apps.web && apps.web.length > 0) {
                    setTimeout(() => {
                        loadApp('web-0', 'web', 0);
                    }, 100); // 添加短暂延迟确保UI更新完成
                }
            })
            .catch(error => {
                console.error('加载应用数据失败:', error);
                showToast('加载应用数据失败', 'error');
            })
    ]);
}

// 更新插件列表
function updatePluginList() {
    const pluginList = document.getElementById('plugin-list');
    if (!pluginList) return;
    
    pluginList.innerHTML = '';
    
    Object.keys(plugins).forEach(pluginId => {
        const li = document.createElement('li');
        li.textContent = pluginId;
        li.dataset.id = pluginId;
        
        if (pluginId === currentPluginId) {
            li.classList.add('active');
        }
        
        li.addEventListener('click', () => {
            loadPlugin(pluginId);
        });
        
        pluginList.appendChild(li);
    });
}

// 更新插件组列表
function updateGroupList() {
    const groupList = document.getElementById('group-list');
    if (!groupList) return;
    
    groupList.innerHTML = '';
    
    Object.keys(groups).forEach(groupId => {
        const li = document.createElement('li');
        li.textContent = groupId;
        li.dataset.id = groupId;
        
        if (groupId === currentGroupId) {
            li.classList.add('active');
        }
        
        li.addEventListener('click', () => {
            loadGroup(groupId);
        });
        
        groupList.appendChild(li);
    });
}

// 更新应用列表
function updateAppList(searchTerm = '', filterType = 'all') {
    const webAppList = document.getElementById('web-app-list');
    if (!webAppList) return;
    
    webAppList.innerHTML = '';
    
    // 添加Web应用
    if (apps.web && apps.web.length > 0) {
        apps.web.forEach((app, index) => {
            // 搜索过滤
            const appName = app.name || `Web应用${index+1}`;
            if (searchTerm && !appName.toLowerCase().includes(searchTerm.toLowerCase())) {
                return;
            }
            
            // 筛选过滤 - 检查应用配置是否为空
            const appId = `web-${index}`;
            const appConfigData = appConfigs.web && appConfigs.web.find(config => config.id === appId);
            
            // 检查配置是否为空（所有配置对象都为空对象）
            let hasNonEmptyConfig = false;
            if (appConfigData && appConfigData.config) {
                const { pluginGroups, plugins, routes } = appConfigData.config;
                hasNonEmptyConfig = (
                    (pluginGroups && Object.keys(pluginGroups).length > 0) ||
                    (plugins && Object.keys(plugins).length > 0) ||
                    (routes && Object.keys(routes).length > 0)
                );
            }
            
            if (filterType === 'configured' && !hasNonEmptyConfig) {
                return;
            }
            if (filterType === 'unconfigured' && hasNonEmptyConfig) {
                return;
            }
            
            const li = document.createElement('li');
            li.textContent = appName;
            li.dataset.id = `web-${index}`;
            li.dataset.category = 'web';
            li.dataset.index = index;
            
            if (`web-${index}` === currentAppId) {
                li.classList.add('active');
            }
            
            li.addEventListener('click', async (event) => {
                await loadApp(`web-${index}`, 'web', index, event);
            });
            
            webAppList.appendChild(li);
        });
    }
    
    // 隧道应用部分已移除
    
    // 初始化插件组下拉列表
    populateGroupSelectorDropdown();
}

// 加载插件
function loadPlugin(pluginId) {
    if (!plugins[pluginId]) return;
    
    currentPluginId = pluginId;
    
    // 更新列表选中状态
    document.querySelectorAll('#plugin-list li').forEach(li => {
        li.classList.toggle('active', li.dataset.id === pluginId);
    });
    
    // 更新编辑器内容
    if (pluginEditor) {
        pluginEditor.setValue(JSON.stringify(plugins[pluginId], null, 2));
    }
}

// 加载插件组
function loadGroup(groupId) {
    if (!groups[groupId]) return;
    
    currentGroupId = groupId;
    
    // 更新列表选中状态
    document.querySelectorAll('#group-list li').forEach(li => {
        li.classList.toggle('active', li.dataset.id === groupId);
    });
    
    // 更新编辑器内容
    if (groupEditor) {
        groupEditor.setValue(JSON.stringify(groups[groupId], null, 2));
    }
}

// 加载应用
async function loadApp(appId, category, index, event) {
    // 如果有事件对象，立即阻止默认行为
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // 如果当前已经选中该应用，不做任何操作
    if (currentAppId === appId) {
        return false;
    }
    
    // 使用统一的检测函数检查未保存内容（异步）
    if (currentAppId) {
        const canContinue = await checkUnsavedChanges('当前内容有未保存的更改，是否继续切换？');
        if (!canContinue) {
            return false; // 用户取消切换，不执行后续代码
        }
    }
    
    // 只处理web应用
    if (!category || category !== 'web') {
        // 从appId解析category和index
        const parts = appId.split('-');
        category = 'web'; // 强制设置为web
        index = parseInt(parts[1]);
    }
    
    if (!apps.web || !apps.web[index]) return;
    
    currentAppId = appId;
    const app = apps.web[index];
    
    // 更新列表选中状态
    document.querySelectorAll('#web-app-list li').forEach(li => {
        li.classList.toggle('active', li.dataset.id === appId);
    });
    
    // 更新应用信息
    const appInfoContent = document.getElementById('app-info-content');
    if (appInfoContent) {
        appInfoContent.innerHTML = `
            <div class="app-info-item"><strong>名称:</strong> ${app.name || '未命名'}</div>
            <div class="app-info-item"><strong>类型:</strong> ${category === 'web' ? 'Web应用' : 'Tunnel应用'}</div>
            <div class="app-info-item"><strong>插件组:</strong> ${app.plugin_group_id || '无'}</div>
        `;
    }
    
    // 更新插件组选择器
    const groupSelector = document.getElementById('group-selector-dropdown');
    if (groupSelector) {
        groupSelector.value = app.plugin_group_id || '';
    }
    
    // 确保app.config对象存在
    if (!app.config) {
        app.config = {
            pluginGroups: {},
            plugins: {},
            routes: {}
        };
    }
    
    // 更新编辑器内容 - 使用updateAppEditorContent函数
    updateAppEditorContent();
}

// 加载元数据
function loadMetadata(type) {
    if (!metadata[type]) {
        metadata[type] = {};
    }
    
    // 更新编辑器内容
    if (metadataEditor) {
        metadataEditor.setValue(JSON.stringify(metadata[type], null, 2));
    }
}

// 填充插件组下拉列表
function populatePluginGroupDropdown() {
    const dropdown = document.getElementById('plugin-group-dropdown');
    if (!dropdown) return;
    
    // 清空现有选项，保留默认选项
    dropdown.innerHTML = '<option value="">-- 请选择插件组 --</option>';
    
    // 添加所有插件组作为选项
    Object.keys(groups).forEach(groupId => {
        const option = document.createElement('option');
        option.value = groupId;
        option.textContent = groupId;
        dropdown.appendChild(option);
    });
}

// 处理插件组选择变化
function handlePluginGroupChange(e) {
    const selectedGroupId = e.target.value;
    // 可以在这里添加其他逻辑，比如高亮显示已应用此插件组的应用
}

// 填充应用选择列表
function populateAppSelectionLists() {
    const webAppsList = document.getElementById('web-apps-list');
    const tunnelAppsList = document.getElementById('tunnel-apps-list');
    const appGroupsList = document.getElementById('app-groups-list');
    
    if (!webAppsList || !tunnelAppsList || !appGroupsList) return;
    
    // 清空现有选项
    webAppsList.innerHTML = '';
    tunnelAppsList.innerHTML = '';
    appGroupsList.innerHTML = '';
    
    // 添加Web应用
    if (apps.web && apps.web.length > 0) {
        apps.web.forEach((app, index) => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = `web-${index}`;
            checkbox.dataset.category = 'web';
            checkbox.dataset.index = index;
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(app.name || `Web应用${index+1}`));
            
            webAppsList.appendChild(label);
        });
    } else {
        webAppsList.innerHTML = '<div class="empty-message">没有可用的Web应用</div>';
    }
    
    // 添加Tunnel应用
    if (apps.tunnel && apps.tunnel.length > 0) {
        apps.tunnel.forEach((app, index) => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = `tunnel-${index}`;
            checkbox.dataset.category = 'tunnel';
            checkbox.dataset.index = index;
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(app.name || `Tunnel应用${index+1}`));
            
            tunnelAppsList.appendChild(label);
        });
    } else {
        tunnelAppsList.innerHTML = '<div class="empty-message">没有可用的Tunnel应用</div>';
    }
    
    // 添加应用组（如果有的话）
    // 这里假设应用组数据结构，实际实现可能需要调整
    if (apps.groups && apps.groups.length > 0) {
        apps.groups.forEach((group, index) => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = `group-${index}`;
            checkbox.dataset.category = 'group';
            checkbox.dataset.index = index;
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(group.name || `应用组${index+1}`));
            
            appGroupsList.appendChild(label);
        });
    } else {
        appGroupsList.innerHTML = '<div class="empty-message">没有可用的应用组</div>';
    }
}

// 切换应用选择列表显示
function toggleAppSelectionLists(type) {
    const webAppsList = document.getElementById('web-apps-list');
    const tunnelAppsList = document.getElementById('tunnel-apps-list');
    const appGroupsList = document.getElementById('app-groups-list');
    
    if (!webAppsList || !tunnelAppsList || !appGroupsList) return;
    
    // 隐藏所有列表
    webAppsList.classList.remove('active');
    tunnelAppsList.classList.remove('active');
    appGroupsList.classList.remove('active');
    
    // 显示选中的列表
    if (type === 'web') {
        webAppsList.classList.add('active');
    } else if (type === 'tunnel') {
        tunnelAppsList.classList.add('active');
    } else if (type === 'app-group') {
        appGroupsList.classList.add('active');
    }
}

// 应用插件组到选中的应用
function applyPluginGroupToSelectedApps() {
    const selectedGroupId = document.getElementById('plugin-group-dropdown').value;
    
    if (!selectedGroupId) {
        showToast('请先选择一个插件组', 'error');
        return;
    }
    
    // 获取当前活动的应用类型
    const activeType = document.querySelector('input[name="app-type"]:checked').value;
    let selectedApps = [];
    
    // 根据应用类型获取选中的应用
    if (activeType === 'web') {
        document.querySelectorAll('#web-apps-list input:checked').forEach(checkbox => {
            selectedApps.push({
                category: 'web',
                index: parseInt(checkbox.dataset.index)
            });
        });
    } else if (activeType === 'tunnel') {
        document.querySelectorAll('#tunnel-apps-list input:checked').forEach(checkbox => {
            selectedApps.push({
                category: 'tunnel',
                index: parseInt(checkbox.dataset.index)
            });
        });
    } else if (activeType === 'app-group') {
        document.querySelectorAll('#app-groups-list input:checked').forEach(checkbox => {
            selectedApps.push({
                category: 'group',
                index: parseInt(checkbox.dataset.index)
            });
        });
    }
    
    if (selectedApps.length === 0) {
        showToast('请至少选择一个应用', 'error');
        return;
    }
    
    // 更新所有选中应用的配置
    selectedApps.forEach(app => {
        if (app.category === 'group') {
            // 如果是应用组，需要更新组内所有应用
            if (apps.groups && apps.groups[app.index] && apps.groups[app.index].apps) {
                apps.groups[app.index].apps.forEach(groupApp => {
                    const [category, appIndex] = groupApp.split('-');
                    if (apps[category] && apps[category][parseInt(appIndex)]) {
                        apps[category][parseInt(appIndex)].plugin_group_id = selectedGroupId;
                    }
                });
            }
        } else {
            // 直接更新单个应用
            if (apps[app.category] && apps[app.category][app.index]) {
                apps[app.category][app.index].plugin_group_id = selectedGroupId;
            }
        }
    });
    
    showToast(`插件组 ${selectedGroupId} 已应用到选中的应用`);
}

// 重置应用选择
function resetAppSelection() {
    // 清除所有选中状态
    document.querySelectorAll('.app-selection-list input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // 重置插件组下拉列表
    const dropdown = document.getElementById('plugin-group-dropdown');
    if (dropdown) {
        dropdown.selectedIndex = 0;
    }
}

// 移除了updateAppSelector和applyGroupToApps函数

// 保存插件
function savePlugin() {
    if (!pluginEditor) return;
    
    try {
        const pluginData = JSON.parse(pluginEditor.getValue());
        plugins = pluginData;
        
        // 使用localStorage保存数据（因为使用的是简单HTTP服务器）
        localStorage.setItem('plugins', JSON.stringify(plugins));
        showToast('插件数据保存成功', 'success');
    } catch (error) {
        console.error('解析JSON失败:', error);
        showToast('JSON格式错误', 'error');
    }
}

// 保存插件组
function saveGroup() {
    if (!groupEditor) return;
    
    try {
        const groupData = JSON.parse(groupEditor.getValue());
        groups = groupData;
        
        // 使用localStorage保存数据（因为使用的是简单HTTP服务器）
        localStorage.setItem('groups', JSON.stringify(groups));
        showToast('插件组数据保存成功', 'success');
    } catch (error) {
        console.error('解析JSON失败:', error);
        showToast('JSON格式错误', 'error');
    }
}

// 保存应用
function saveApp() {
    if (!currentAppId || !appEditor) return;
    
    try {
        const configData = JSON.parse(appEditor.getValue());
        const parts = currentAppId.split('-');
        const category = parts[0];
        const index = parseInt(parts[1]);
        
        if (!apps[category] || !apps[category][index]) return;
        
        // 检查是否为隧道应用，直接禁止保存
        if (category === 'tunnel') {
            showToast('隧道应用不支持自定义网关插件，保存无效', 'error');
            return;
        }
        
        // 查找或创建应用配置
        let appConfigData = appConfigs[category] ? appConfigs[category].find(c => c.id === currentAppId) : null;
        
        if (!appConfigData) {
            if (!appConfigs[category]) {
                appConfigs[category] = [];
            }
            
            appConfigData = {
                id: currentAppId,
                config: {
                    pluginGroups: {},
                    plugins: {},
                    routes: {}
                }
            };
            
            appConfigs[category].push(appConfigData);
        }
        
        // 保存当前配置类型的数据
        appConfigData.config[currentAppConfigType] = configData;
        
        // 确保其他配置类型也存在
        if (!appConfigData.config.pluginGroups) appConfigData.config.pluginGroups = {};
        if (!appConfigData.config.plugins) appConfigData.config.plugins = {};
        if (!appConfigData.config.routes) appConfigData.config.routes = {};
        
        // 保存到本地存储
        localStorage.setItem('appConfigs', JSON.stringify(appConfigs));
        
        console.log('保存应用配置:', currentAppId, currentAppConfigType, configData);
        
        updateAppList();
        showToast('应用配置保存成功');
    } catch (error) {
        console.error('保存应用配置失败:', error);
        showToast(`保存失败: ${error.message}`, 'error');
    }
}

// 保存元数据
function saveMetadata() {
    if (!metadataEditor) return;
    
    try {
        const metadataData = JSON.parse(metadataEditor.getValue());
        metadata[currentMetadataType] = metadataData;
        showToast('元数据保存成功');
    } catch (error) {
        showToast(`保存失败: ${error.message}`, 'error');
    }
}

// 删除插件
function deletePlugin() {
    if (!currentPluginId) return;
    
    showDialog('删除插件', 'confirm', `确定要删除插件 "${currentPluginId}" 吗？`, () => {
        delete plugins[currentPluginId];
        updatePluginList();
        
        // 清空编辑器
        if (pluginEditor) {
            pluginEditor.setValue('{}');
        }
        
        currentPluginId = null;
        showToast('插件已删除');
    });
}

// 删除插件组
function deleteGroup() {
    if (!currentGroupId) return;
    
    showDialog('删除插件组', 'confirm', `确定要删除插件组 "${currentGroupId}" 吗？`, () => {
        delete groups[currentGroupId];
        updateGroupList();
        
        // 清空编辑器
        if (groupEditor) {
            groupEditor.setValue('[]');
        }
        
        currentGroupId = null;
        showToast('插件组已删除');
    });
}

// 显示对话框
function showDialog(title, type, message = '', callback = null) {
    const dialog = document.getElementById('dialog');
    const dialogTitle = document.getElementById('dialog-title');
    const dialogBody = document.getElementById('dialog-body');
    
    dialogTitle.textContent = title;
    
    // 根据类型设置对话框内容
    if (type === 'plugin') {
        dialogBody.innerHTML = `
            <div class="form-group">
                <label for="plugin-id">插件ID</label>
                <input type="text" id="plugin-id" class="form-control" required>
            </div>
        `;
    } else if (type === 'group') {
        dialogBody.innerHTML = `
            <div class="form-group">
                <label for="group-id">插件组ID</label>
                <input type="text" id="group-id" class="form-control" required>
            </div>
        `;
    } else if (type === 'confirm') {
        dialogBody.innerHTML = `<p>${message}</p>`;
    }
    
    // 保存回调函数
    dialog._callback = callback;
    
    // 显示对话框
    dialog.classList.add('active');
}

// 隐藏对话框
function hideDialog() {
    const dialog = document.getElementById('dialog');
    dialog.classList.remove('active');
}

// 确认对话框
function confirmDialog() {
    const dialog = document.getElementById('dialog');
    const dialogTitle = document.getElementById('dialog-title');
    
    if (dialogTitle.textContent.includes('新增插件')) {
        const pluginId = document.getElementById('plugin-id').value.trim();
        
        if (!pluginId) {
            showToast('插件ID不能为空', 'error');
            return;
        }
        
        if (plugins[pluginId]) {
            showToast('插件ID已存在', 'error');
            return;
        }
        
        // 创建新插件
        plugins[pluginId] = { conf: {} };
        updatePluginList();
        loadPlugin(pluginId);
        
        showToast('插件创建成功');
    } else if (dialogTitle.textContent.includes('新增插件组')) {
        const groupId = document.getElementById('group-id').value.trim();
        
        if (!groupId) {
            showToast('插件组ID不能为空', 'error');
            return;
        }
        
        if (groups[groupId]) {
            showToast('插件组ID已存在', 'error');
            return;
        }
        
        // 创建新插件组
        groups[groupId] = [];
        updateGroupList();
        loadGroup(groupId);
        
        showToast('插件组创建成功');
    } else if (dialog._callback) {
        // 执行回调函数
        dialog._callback();
    }
    
    // 隐藏对话框
    hideDialog();
}

// 显示提示框
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    
    // 设置提示内容
    toast.textContent = message;
    
    // 设置提示类型
    toast.className = 'toast';
    toast.classList.add(type);
    toast.classList.add('active');
    
    // 3秒后自动隐藏
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// 移除测试用例加载函数
function populateGroupSelectorDropdown() {
    const dropdown = document.getElementById('group-selector-dropdown');
    if (!dropdown) return;
    
    // 清空现有选项，保留默认选项
    dropdown.innerHTML = '<option value="">-- 无插件组 --</option>';
    
    // 添加所有插件组作为选项
    Object.keys(groups).forEach(groupId => {
        const option = document.createElement('option');
        option.value = groupId;
        option.textContent = groupId;
        dropdown.appendChild(option);
    });
}

// 将插件组应用到当前应用
async function applyGroupToCurrentApp(event) {
    if (!currentAppId) {
        showToast('请先选择一个应用', 'warning');
        return;
    }
    
    const groupSelector = document.getElementById('group-selector-dropdown');
    const selectedGroupId = groupSelector.value;
    
    // 解析当前应用的category和index
    const parts = currentAppId.split('-');
    const category = parts[0];
    const index = parseInt(parts[1]);
    
    if (!apps[category] || !apps[category][index]) {
        showToast('应用不存在', 'error');
        return;
    }
    
    // 更新应用的插件组ID
    if (selectedGroupId) {
        apps[category][index].plugin_group_id = selectedGroupId;
        showToast(`已将插件组 "${selectedGroupId}" 应用到 "${apps[category][index].name}"`, 'success');
    } else {
        // 如果选择了"无插件组"，则移除插件组ID
        delete apps[category][index].plugin_group_id;
        showToast(`已移除 "${apps[category][index].name}" 的插件组配置`, 'success');
    }
    
    // 重新加载应用以更新显示
    await loadApp(currentAppId, category, index, event);
}