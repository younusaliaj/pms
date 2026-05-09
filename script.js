let processes = [];

function addProcess() {
  let pid = document.getElementById("pid").value.trim();
  let arrivalTime = parseInt(document.getElementById("arrivalTime").value);
  let burstTime = parseInt(document.getElementById("burstTime").value);
  let priority = parseInt(document.getElementById("priority").value);

  if (pid === "" || isNaN(arrivalTime) || isNaN(burstTime) || isNaN(priority)) {
    alert("Please fill all fields correctly.");
    return;
  }

  if (burstTime <= 0) {
    alert("Burst time must be greater than 0.");
    return;
  }

  let duplicate = processes.some(p => p.pid === pid);

  if (duplicate) {
    alert("Process ID already exists.");
    return;
  }

  let process = {
    pid: pid,
    arrivalTime: arrivalTime,
    burstTime: burstTime,
    remainingTime: burstTime,
    priority: priority,
    state: "Ready",
    completionTime: "-",
    waitingTime: "-",
    turnaroundTime: "-"
  };

  processes.push(process);

  clearInputFields();
  updateTable();
  updateReadyQueue();
}

function clearInputFields() {
  document.getElementById("pid").value = "";
  document.getElementById("arrivalTime").value = "";
  document.getElementById("burstTime").value = "";
  document.getElementById("priority").value = "";
}

function updateTable() {
  let table = document.getElementById("processTable");

  if (processes.length === 0) {
    table.innerHTML = `<tr><td colspan="9">No process available.</td></tr>`;
    return;
  }

  table.innerHTML = "";

  processes.forEach((p, index) => {
    table.innerHTML += `
      <tr>
        <td>${p.pid}</td>
        <td>${p.state}</td>
        <td>${p.arrivalTime}</td>
        <td>${p.burstTime}</td>
        <td>${p.priority}</td>
        <td>${p.completionTime}</td>
        <td>${p.waitingTime}</td>
        <td>${p.turnaroundTime}</td>
        <td>
          <button class="action-btn waiting" onclick="blockProcess(${index})">Block</button>
          <button class="action-btn resume" onclick="resumeProcess(${index})">Resume</button>
          <button class="action-btn kill" onclick="killProcess(${index})">Kill</button>
        </td>
      </tr>
    `;
  });
}

function updateReadyQueue() {
  let readyQueue = document.getElementById("readyQueue");

  let readyProcesses = processes.filter(p => p.state === "Ready");

  if (readyProcesses.length === 0) {
    readyQueue.innerHTML = "No process in Ready Queue.";
    return;
  }

  readyQueue.innerHTML = readyProcesses.map(p => p.pid).join(" → ");
}

function blockProcess(index) {
  if (processes[index].state === "Terminated") {
    alert("Terminated process cannot be blocked.");
    return;
  }

  processes[index].state = "Waiting";
  updateTable();
  updateReadyQueue();
}

function resumeProcess(index) {
  if (processes[index].state === "Terminated") {
    alert("Terminated process cannot be resumed.");
    return;
  }

  processes[index].state = "Ready";
  updateTable();
  updateReadyQueue();
}

function killProcess(index) {
  processes[index].state = "Terminated";
  processes[index].completionTime = "-";
  processes[index].waitingTime = "-";
  processes[index].turnaroundTime = "-";

  updateTable();
  updateReadyQueue();
}

function clearAll() {
  processes = [];
  document.getElementById("ganttChart").innerHTML = "No scheduling result yet.";
  document.getElementById("avgWT").innerText = "0";
  document.getElementById("avgTAT").innerText = "0";
  updateTable();
  updateReadyQueue();
}

function runScheduling() {
  if (processes.length === 0) {
    alert("Please add processes first.");
    return;
  }

  let readyProcesses = processes.filter(p => p.state !== "Terminated");

  if (readyProcesses.length === 0) {
    alert("No active process available for scheduling.");
    return;
  }

  let algorithm = document.getElementById("algorithm").value;

  resetProcessResults();

  if (algorithm === "fcfs") {
    fcfsScheduling();
  } else if (algorithm === "sjf") {
    sjfScheduling();
  } else if (algorithm === "priority") {
    priorityScheduling();
  } else if (algorithm === "rr") {
    roundRobinScheduling();
  }

  updateTable();
  updateReadyQueue();
}

function resetProcessResults() {
  processes.forEach(p => {
    if (p.state !== "Terminated") {
      p.state = "Ready";
      p.remainingTime = p.burstTime;
      p.completionTime = "-";
      p.waitingTime = "-";
      p.turnaroundTime = "-";
    }
  });
}

function fcfsScheduling() {
  let activeProcesses = processes
    .filter(p => p.state !== "Terminated")
    .sort((a, b) => a.arrivalTime - b.arrivalTime);

  let time = 0;
  let ganttData = [];

  activeProcesses.forEach(p => {
    if (time < p.arrivalTime) {
      time = p.arrivalTime;
    }

    p.state = "Running";

    let startTime = time;
    time += p.burstTime;
    let endTime = time;

    p.completionTime = endTime;
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
    p.state = "Terminated";

    ganttData.push({
      pid: p.pid,
      start: startTime,
      end: endTime
    });
  });

  displayGanttChart(ganttData);
  calculateAverage(activeProcesses);
}

function sjfScheduling() {
  let activeProcesses = processes.filter(p => p.state !== "Terminated");
  let completed = 0;
  let time = 0;
  let ganttData = [];
  let n = activeProcesses.length;

  while (completed < n) {
    let available = activeProcesses.filter(p => {
      return p.arrivalTime <= time && p.completionTime === "-";
    });

    if (available.length === 0) {
      time++;
      continue;
    }

    available.sort((a, b) => a.burstTime - b.burstTime);

    let p = available[0];

    p.state = "Running";

    let startTime = time;
    time += p.burstTime;
    let endTime = time;

    p.completionTime = endTime;
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
    p.state = "Terminated";

    ganttData.push({
      pid: p.pid,
      start: startTime,
      end: endTime
    });

    completed++;
  }

  displayGanttChart(ganttData);
  calculateAverage(activeProcesses);
}

function priorityScheduling() {
  let activeProcesses = processes.filter(p => p.state !== "Terminated");
  let completed = 0;
  let time = 0;
  let ganttData = [];
  let n = activeProcesses.length;

  while (completed < n) {
    let available = activeProcesses.filter(p => {
      return p.arrivalTime <= time && p.completionTime === "-";
    });

    if (available.length === 0) {
      time++;
      continue;
    }

    available.sort((a, b) => a.priority - b.priority);

    let p = available[0];

    p.state = "Running";

    let startTime = time;
    time += p.burstTime;
    let endTime = time;

    p.completionTime = endTime;
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
    p.state = "Terminated";

    ganttData.push({
      pid: p.pid,
      start: startTime,
      end: endTime
    });

    completed++;
  }

  displayGanttChart(ganttData);
  calculateAverage(activeProcesses);
}

function roundRobinScheduling() {
  let timeQuantum = parseInt(document.getElementById("timeQuantum").value);

  if (isNaN(timeQuantum) || timeQuantum <= 0) {
    alert("Please enter a valid Time Quantum for Round Robin.");
    return;
  }

  let activeProcesses = processes
    .filter(p => p.state !== "Terminated")
    .sort((a, b) => a.arrivalTime - b.arrivalTime);

  let queue = [];
  let time = 0;
  let completed = 0;
  let n = activeProcesses.length;
  let ganttData = [];
  let visited = new Set();

  while (completed < n) {
    activeProcesses.forEach(p => {
      if (p.arrivalTime <= time && !visited.has(p.pid) && p.remainingTime > 0) {
        queue.push(p);
        visited.add(p.pid);
      }
    });

    if (queue.length === 0) {
      time++;
      continue;
    }

    let current = queue.shift();
    current.state = "Running";

    let startTime = time;

    if (current.remainingTime > timeQuantum) {
      time += timeQuantum;
      current.remainingTime -= timeQuantum;
    } else {
      time += current.remainingTime;
      current.remainingTime = 0;
      current.completionTime = time;
      current.turnaroundTime = current.completionTime - current.arrivalTime;
      current.waitingTime = current.turnaroundTime - current.burstTime;
      current.state = "Terminated";
      completed++;
    }

    let endTime = time;

    ganttData.push({
      pid: current.pid,
      start: startTime,
      end: endTime
    });

    activeProcesses.forEach(p => {
      if (p.arrivalTime <= time && !visited.has(p.pid) && p.remainingTime > 0) {
        queue.push(p);
        visited.add(p.pid);
      }
    });

    if (current.remainingTime > 0) {
      current.state = "Ready";
      queue.push(current);
    }
  }

  displayGanttChart(ganttData);
  calculateAverage(activeProcesses);
}

function displayGanttChart(ganttData) {
  let ganttChart = document.getElementById("ganttChart");

  if (ganttData.length === 0) {
    ganttChart.innerHTML = "No scheduling result yet.";
    return;
  }

  ganttChart.innerHTML = "";

  ganttData.forEach(item => {
    ganttChart.innerHTML += `
      <div class="gantt-item">
        ${item.pid}
        <div class="gantt-time">${item.start} - ${item.end}</div>
      </div>
    `;
  });
}

function calculateAverage(activeProcesses) {
  let totalWT = 0;
  let totalTAT = 0;

  activeProcesses.forEach(p => {
    totalWT += p.waitingTime;
    totalTAT += p.turnaroundTime;
  });

  let avgWT = totalWT / activeProcesses.length;
  let avgTAT = totalTAT / activeProcesses.length;

  document.getElementById("avgWT").innerText = avgWT.toFixed(2);
  document.getElementById("avgTAT").innerText = avgTAT.toFixed(2);
}