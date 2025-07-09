    
        // Google Sheets API configuration
        const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
        const SHEET_NAME = 'Tasks';
        let gapiInited = false;

        // Initialize Google API
        function gapiInit() {
            gapi.load('client', initializeGapiClient);
        }

        async function initializeGapiClient() {
            await gapi.client.init({
                apiKey: 'YOUR_API_KEY',
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
            });
            gapiInited = true;
            loadTasks();
        }

        // DOM Elements
        const createTaskBtn = document.getElementById('createTaskBtn');
        const taskModal = document.getElementById('taskModal');
        const closeTaskModal = document.getElementById('closeTaskModal');
        const cancelTask = document.getElementById('cancelTask');
        const taskForm = document.getElementById('taskForm');
        const priorityBtns = document.querySelectorAll('.priority-btn');
        const taskPriority = document.getElementById('taskPriority');

        // Task counter
        let taskIdCounter = 0;

        // Initialize drag and drop
        document.addEventListener('DOMContentLoaded', function() {
            gapiInit();
            // Drag and drop functionality
            const tasks = document.querySelectorAll('.task-card');
            const dropzones = document.querySelectorAll('.dropzone');

            tasks.forEach(task => {
                task.addEventListener('dragstart', dragStart);
                task.addEventListener('dragend', dragEnd);
            });

            dropzones.forEach(zone => {
                zone.addEventListener('dragover', dragOver);
                zone.addEventListener('dragenter', dragEnter);
                zone.addEventListener('dragleave', dragLeave);
                zone.addEventListener('drop', dragDrop);
            });

            // Priority button selection
            priorityBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    priorityBtns.forEach(b => {
                        b.classList.remove('bg-blue-100', 'border-blue-500', 'text-blue-800');
                        b.classList.add('bg-gray-100', 'border-gray-300', 'text-gray-700');
                    });
                    this.classList.remove('bg-gray-100', 'border-gray-300', 'text-gray-700');
                    this.classList.add('bg-blue-100', 'border-blue-500', 'text-blue-800');
                    taskPriority.value = this.dataset.priority;
                });
            });

            // Set medium priority as default
            document.querySelector('.priority-btn[data-priority="medium"]').click();
        });

        // Modal controls
        createTaskBtn.addEventListener('click', () => {
            taskModal.classList.remove('hidden');
        });

        closeTaskModal.addEventListener('click', () => {
            taskModal.classList.add('hidden');
        });

        cancelTask.addEventListener('click', () => {
            taskModal.classList.add('hidden');
        });

        // Form submission
        taskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const title = document.getElementById('taskTitle').value;
            const description = document.getElementById('taskDescription').value;
            const status = document.getElementById('taskStatus').value;
            const dueDate = document.getElementById('taskDueDate').value;
            const priority = taskPriority.value;
            
            createTask(title, description, status, dueDate, priority);
            
            // Reset form
            taskForm.reset();
            taskModal.classList.add('hidden');
        });

        // Load tasks from Google Sheet
        async function loadTasks() {
            if (!gapiInited) return;
            
            try {
                const response = await gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${SHEET_NAME}!A2:E`,
                });
                
                const tasks = response.result.values || [];
                tasks.forEach(task => {
                    renderTask(task[0], task[1], task[2], task[3], task[4]);
                    taskIdCounter = Math.max(taskIdCounter, parseInt(task[0]));
                });
            } catch (err) {
                console.error('Error loading tasks:', err);
            }
        }

        // Save task to Google Sheet
        async function saveTask(id, title, description, status, dueDate, priority) {
            if (!gapiInited) return;
            
            try {
                await gapi.client.sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${SHEET_NAME}!A1:E1`,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [[id, title, description, status, dueDate, priority]]
                    }
                });
            } catch (err) {
                console.error('Error saving task:', err);
            }
        }

        // Render task in UI
        function renderTask(id, title, description, status, dueDate, priority) {
            const taskElement = document.createElement('div');
            taskElement.className = 'bg-white rounded-lg p-4 shadow-sm task-card cursor-move';
            taskElement.setAttribute('draggable', 'true');
            taskElement.setAttribute('data-task-id', taskIdCounter);
            
            // Priority color mapping
            const priorityColors = {
                'low': 'bg-green-100 text-green-800',
                'medium': 'bg-yellow-100 text-yellow-800',
                'high': 'bg-red-100 text-red-800'
            };
            
            // Format due date display
            let dueDateDisplay = 'No due date';
            if (dueDate) {
                const date = new Date(dueDate);
                dueDateDisplay = `Due: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            }
            
            taskElement.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-medium text-gray-800">${title}</h4>
                    <div class="flex space-x-1">
                        <span class="${priorityColors[priority]} text-xs px-2 py-1 rounded">${priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
                    </div>
                </div>
                <p class="text-gray-600 text-sm mb-3">${description || 'No description'}</p>
                <div class="flex justify-between items-center text-xs text-gray-500">
                    <div class="flex items-center">
                        <i class="far fa-calendar-alt mr-1"></i>
                        <span>${dueDateDisplay}</span>
                    </div>
                    <div class="flex -space-x-1">
                        <img class="w-6 h-6 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/men/32.jpg" alt="">
                    </div>
                </div>
            `;
            
            // Add drag events
            taskElement.addEventListener('dragstart', dragStart);
            taskElement.addEventListener('dragend', dragEnd);
            
            // Add to the appropriate column
            document.getElementById(`${status}-tasks`).appendChild(taskElement);
            
            // Update task count
            updateTaskCount(status);
        }

        // Create a new task
        async function createTask(title, description, status, dueDate, priority) {
            taskIdCounter++;
            
            // Save to Google Sheet
            await saveTask(taskIdCounter, title, description, status, dueDate, priority);
            
            // Render in UI
            renderTask(taskIdCounter, title, description, status, dueDate, priority);
        }

        // Update task count in column header
        function updateTaskCount(status) {
            const column = document.querySelector(`.column[data-status="${status}"]`);
            const countElement = column.querySelector('span');
            const tasks = column.querySelectorAll('.task-card').length;
            countElement.textContent = tasks;
        }

        // Drag and drop functions
        function dragStart() {
            this.classList.add('dragging');
            setTimeout(() => this.classList.add('opacity-0'), 0);
        }

        function dragEnd() {
            this.classList.remove('dragging', 'opacity-0');
        }

        function dragOver(e) {
            e.preventDefault();
        }

        function dragEnter(e) {
            e.preventDefault();
            this.classList.add('active');
        }

        function dragLeave() {
            this.classList.remove('active');
        }

        function dragDrop() {
            this.classList.remove('active');
            const draggingTask = document.querySelector('.dragging');
            
            // Get the status from the dropzone
            const newStatus = this.dataset.status;
            
            // Update the task's status (in a real app, you would update the database here)
            
            // Append the task to the dropzone
            this.querySelector(`#${newStatus}-tasks`).appendChild(draggingTask);
            
            // Update task counts
            const columns = document.querySelectorAll('.column');
            columns.forEach(col => {
                const status = col.dataset.status;
                const count = col.querySelectorAll('.task-card').length;
                col.querySelector('span').textContent = count;
            });
        }

