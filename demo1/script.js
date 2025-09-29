// 全局变量
let plugins = {};
let groups = {};
let apps = {};
let metadata = {
    plugin: {},
    group: {},
    app: {}
};

let currentPluginId = null;
let currentGroupId = null;
let currentAppId = null;
let currentMetadataType = 'plugin';

let pluginEditor = null;
let groupEditor = null;
let appEditor = null;
let metadataEditor = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initEditors();
    initEventListeners();
    loadData();
    // 初始化应用类型切换
    initAppTypeTabs();
});

// 初始化标签页切换
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有活动状态
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // 设置当前标签为活动状态
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// 初始化编辑器
function initEditors() {
    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.36.1/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        // 创建插件编辑器
        pluginEditor = monaco.editor.create(document.getElementById('plugin-editor'), {
            value: '{}',
            language: 'json',
            theme: 'vs',
            automaticLayout: true,
            minimap: { enabled: false }
        });
        
        // 创建插件组编辑器
        groupEditor = monaco.editor.create(document.getElementById('group-editor'), {
            value: '[]',
            language: 'json',
            theme: 'vs',
            automaticLayout: true,
            minimap: { enabled: false }
        });
        
        // 创建应用编辑器
        appEditor = monaco.editor.create(document.getElementById('app-editor'), {
            value: '{}',
            language: 'json',
            theme: 'vs',
            automaticLayout: true,
            minimap: { enabled: false }
        });
        
        // 创建元数据编辑器
        metadataEditor = monaco.editor.create(document.getElementById('metadata-editor'), {
            value: '{}',
            language: 'json',
            theme: 'vs',
            automaticLayout: true,
            minimap: { enabled: false }
        });
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
function initAppTypeTabs() {
    const webAppBtn = document.getElementById('web-app-btn');
    const tunnelAppBtn = document.getElementById('tunnel-app-btn');
    
    webAppBtn.addEventListener('click', function() {
        // 激活WEB应用按钮
        webAppBtn.classList.add('active');
        tunnelAppBtn.classList.remove('active');
        
        // 显示WEB应用列表，隐藏隧道应用列表
        document.getElementById('web-app-container').classList.add('active');
        document.getElementById('tunnel-app-container').classList.remove('active');
        handleSearchFilter();
    });
    
    tunnelAppBtn.addEventListener('click', function() {
        // 激活隧道应用按钮
        tunnelAppBtn.classList.add('active');
        webAppBtn.classList.remove('active');
        
        // 显示隧道应用列表，隐藏WEB应用列表
        document.getElementById('tunnel-app-container').classList.add('active');
        document.getElementById('web-app-container').classList.remove('active');
        handleSearchFilter();
    });
    
    // 添加搜索和筛选事件监听器
    document.getElementById('app-search')?.addEventListener('input', handleSearchFilter);
    document.getElementById('app-filter')?.addEventListener('change', handleSearchFilter);
}

// 处理搜索和筛选
function handleSearchFilter() {
    const searchTerm = document.getElementById('app-search')?.value || '';
    const filterType = document.getElementById('app-filter')?.value || 'all';
    updateAppList(searchTerm, filterType);
}

// 初始化事件监听器
function initEventListeners() {
    // 插件相关事件
    document.getElementById('add-plugin')?.addEventListener('click', () => showDialog('新增插件', 'plugin'));
    document.getElementById('delete-plugin')?.addEventListener('click', deletePlugin);
    document.getElementById('save-plugin')?.addEventListener('click', savePlugin);
    document.getElementById('reset-plugin')?.addEventListener('click', () => loadPlugin(currentPluginId));
    document.getElementById('format-plugin')?.addEventListener('click', () => formatJSON(pluginEditor));
    
    // 插件组相关事件
    document.getElementById('add-group')?.addEventListener('click', () => showDialog('新增插件组', 'group'));
    document.getElementById('delete-group')?.addEventListener('click', deleteGroup);
    document.getElementById('save-group')?.addEventListener('click', saveGroup);
    document.getElementById('reset-group')?.addEventListener('click', () => loadGroup(currentGroupId));
    document.getElementById('format-group')?.addEventListener('click', () => formatJSON(groupEditor));
    
    // 应用相关事件
    document.getElementById('save-app')?.addEventListener('click', saveApp);
    document.getElementById('reset-app')?.addEventListener('click', () => loadApp(currentAppId));
    document.getElementById('apply-group-to-app')?.addEventListener('click', applyGroupToCurrentApp);
    document.getElementById('format-app')?.addEventListener('click', () => formatJSON(appEditor));
    
    // 移除插件组应用到应用的事件
    
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
    
    // 元数据相关事件
    document.getElementById('save-metadata')?.addEventListener('click', saveMetadata);
    document.getElementById('reset-metadata')?.addEventListener('click', () => loadMetadata(currentMetadataType));
    document.getElementById('format-metadata')?.addEventListener('click', () => formatJSON(metadataEditor));
    document.querySelectorAll('input[name="metadata-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentMetadataType = e.target.value;
            loadMetadata(currentMetadataType);
        });
    });
    
    // 对话框相关事件
    document.getElementById('dialog-close')?.addEventListener('click', hideDialog);
    document.getElementById('dialog-cancel')?.addEventListener('click', hideDialog);
    document.getElementById('dialog-confirm')?.addEventListener('click', confirmDialog);
    
    // 移除测试用例加载功能
}

// 加载数据
function loadData() {
    // 加载插件数据
    fetch('../data/plugins.json')
        .then(response => response.json())
        .then(data => {
            plugins = data;
            updatePluginList();
        })
        .catch(error => {
            console.error('加载插件数据失败:', error);
            showToast('加载插件数据失败', 'error');
        });
    
    // 加载插件组数据
    fetch('../data/plugins-groups.json')
        .then(response => response.json())
        .then(data => {
            groups = data;
            updateGroupList();
        })
        .catch(error => {
            console.error('加载插件组数据失败:', error);
            showToast('加载插件组数据失败', 'error');
        });
    
    // 加载应用数据
    fetch('../data/aplications.json')
        .then(response => response.json())
        .then(data => {
            apps = data;
            updateAppList();
        })
        .catch(error => {
            console.error('加载应用数据失败:', error);
            showToast('加载应用数据失败', 'error');
        });
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
    const tunnelAppList = document.getElementById('tunnel-app-list');
    if (!webAppList || !tunnelAppList) return;
    
    webAppList.innerHTML = '';
    tunnelAppList.innerHTML = '';
    
    // 添加Web应用
    if (apps.web && apps.web.length > 0) {
        apps.web.forEach((app, index) => {
            const appName = app.name || `Web应用${index+1}`;
            
            // 搜索过滤
            if (searchTerm && !appName.toLowerCase().includes(searchTerm.toLowerCase())) {
                return;
            }
            
            // 筛选过滤
            if (filterType === 'configured' && !app.plugin_group_id) {
                return;
            }
            if (filterType === 'unconfigured' && app.plugin_group_id) {
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
            
            li.addEventListener('click', () => {
                loadApp(`web-${index}`, 'web', index);
            });
            
            webAppList.appendChild(li);
        });
    }
    
    // 添加Tunnel应用
    if (apps.tunnel && apps.tunnel.length > 0) {
        apps.tunnel.forEach((app, index) => {
            const appName = app.name || `隧道应用${index+1}`;
            
            // 搜索过滤
            if (searchTerm && !appName.toLowerCase().includes(searchTerm.toLowerCase())) {
                return;
            }
            
            // 筛选过滤
            if (filterType === 'configured' && !app.plugin_group_id) {
                return;
            }
            if (filterType === 'unconfigured' && app.plugin_group_id) {
                return;
            }
            
            const li = document.createElement('li');
            li.textContent = appName;
            li.dataset.id = `tunnel-${index}`;
            li.dataset.category = 'tunnel';
            li.dataset.index = index;
            
            if (`tunnel-${index}` === currentAppId) {
                li.classList.add('active');
            }
            
            li.addEventListener('click', () => {
                loadApp(`tunnel-${index}`, 'tunnel', index);
            });
            
            tunnelAppList.appendChild(li);
        });
    }
    
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
function loadApp(appId, category, index) {
    if (!category) {
        // 从appId解析category和index
        const parts = appId.split('-');
        category = parts[0];
        index = parseInt(parts[1]);
    }
    
    if (!apps[category] || !apps[category][index]) return;
    
    currentAppId = appId;
    const app = apps[category][index];
    
    // 更新列表选中状态
    document.querySelectorAll('#web-app-list li, #tunnel-app-list li').forEach(li => {
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
    
    // 更新编辑器内容
    if (appEditor) {
        // 创建插件配置对象
        const pluginConfig = {
            plugin_group_id: app.plugin_group_id || ""
        };
        
        // 如果是隧道应用，添加提示信息
        if (category === 'tunnel') {
            const tunnelWarning = {
                "提示": "隧道应用不支持自定义网关插件，保存无效"
            };
            appEditor.setValue(JSON.stringify(tunnelWarning, null, 2));
        } else {
            appEditor.setValue(JSON.stringify(pluginConfig, null, 2));
        }
    }
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
    if (!currentPluginId || !pluginEditor) return;
    
    try {
        const pluginData = JSON.parse(pluginEditor.getValue());
        plugins[currentPluginId] = pluginData;
        updatePluginList();
        showToast('插件保存成功');
    } catch (error) {
        showToast(`保存失败: ${error.message}`, 'error');
    }
}

// 保存插件组
function saveGroup() {
    if (!currentGroupId || !groupEditor) return;
    
    try {
        const groupData = JSON.parse(groupEditor.getValue());
        groups[currentGroupId] = groupData;
        
        // 更新列表
        updateGroupList();
        
        showToast('插件组保存成功');
    } catch (error) {
        showToast(`保存失败: ${error.message}`, 'error');
    }
}

// 保存应用
function saveApp() {
    if (!currentAppId || !appEditor) return;
    
    try {
        const pluginConfig = JSON.parse(appEditor.getValue());
        const parts = currentAppId.split('-');
        const category = parts[0];
        const index = parseInt(parts[1]);
        
        if (!apps[category] || !apps[category][index]) return;
        
        // 检查是否为隧道应用，直接禁止保存
        if (category === 'tunnel') {
            showToast('隧道应用不支持自定义网关插件，保存无效', 'error');
            return;
        }
        
        // 只更新插件组配置
        apps[category][index].plugin_group_id = pluginConfig.plugin_group_id || "";
        
        updateAppList();
        showToast('插件配置保存成功');
    } catch (error) {
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
function applyGroupToCurrentApp() {
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
    loadApp(currentAppId, category, index);
}