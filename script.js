let conn;
let hosting = false;
let clients = [];
let username = ""
function createRoom(newid) {
  document.getElementById('AdminPanel').style.display = 'block';
  document.getElementById('chat').innerHTML = '';
  document.getElementById('users').innerText = 'Users: 1';
  peer = new Peer(newid, {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    }
  });
  id = '';
  clients = [];
  conn = null;
  hosting = false;
  peer.on('open', (i) => {
    hosting = true;
    id = i;
    document.getElementById('session').innerText = i;
  });

  peer.on('connection', (c) => {
    c.on('open', () => {
      clients.push(c);
      sendToClients({
        type: 'Update',
        content: 'A new user has joined the chat.',
      });
      processReq({
        type: 'Update',
        content: 'A new user has joined the chat.',
      });
      document.getElementById('users').innerText =
        'Users: ' + (clients.length + 1).toString();
    });
    c.on('data', (dat) => {
      if (dat.type === 'Message' || dat.type === 'usernameUpdate') {
        processReq(dat);
        console.log(dat);
        sendToClients(dat);
      }
    });
  });

  peer.on('error', (err) => {
    if (err.type === 'unavailable-id') {
      alert('That Chat ID is already taken! Please try a different one.');
      createRoom();
    } else {
      console.error('PeerJS Error:', err);
    }
  });
}
createRoom();

function join(id) {
  // 1. Hide the admin panel since this user is a client
  document.getElementById('AdminPanel').style.display = 'none';
  hosting = false;

  // 2. Cleanly close any existing connection
  if (conn) {
    conn.close();
  }

  // 3. Initiate the new connection
  conn = peer.connect(id);

  // 4. WAIT for the connection to hand-shake successfully
  conn.on('open', () => {
    document.getElementById('session').innerText = 'Connected To Host';
    console.log("Successfully shifted to room: " + id);

    // 5. Securely bind the data listener ONLY after it's open
    conn.on('data', (dat) => {
      // (Optional: Keep your security whitelisting here if you want)
      if (dat.type === 'Message' || dat.type === 'Update' || dat.type === 'Alert') {
        processReq(dat);
        console.log(dat);
      }
    });
  });

  // Handle connection errors (like if the room ID doesn't exist)
  conn.on('error', (err) => {
    console.error("Connection failed:", err);
    document.getElementById('session').innerText = 'Connection Failed';
  });
}

function send() {
  if (hosting) {
    sendToClients({
      type: 'Message',
      content:
        '[HOST] (' +
        document.getElementById('name').value +
        '): ' +
        document.getElementById('msg').value,
    });
    processReq({
      type: 'Message',
      content:
        '[HOST] (' +
        document.getElementById('name').value +
        '): ' +
        document.getElementById('msg').value,
    });
    document.getElementById('msg').value = '';
  } else {
    conn.send({
      type: 'Message',
      content:
        '(' +
        document.getElementById('name').value +
        '): ' +
        document.getElementById('msg').value,
    });
    document.getElementById('msg').value = '';
  }
}

function sendToClients(msg) {
  clients.forEach((client) => {
    if (client.open) {
      client.send(msg);
    }
  });
}

function processReq(message) {
  if (message.type == 'Message') {
    const chatBox = document.getElementById('chat');
    let msg = document.createElement('p');
    msg.innerText = message.content;
    chatBox.appendChild(msg);
  } else if (message.type == 'Update') {
    const chatBox = document.getElementById('chat');
    let msg = document.createElement('p');
    msg.style.fontSize = '10px';
    msg.innerText = message.content;
    chatBox.appendChild(msg);
  } else if (message.type == 'Alert') {
    const chatBox = document.getElementById('chat');
    let msg = document.createElement('p');
    msg.style.fontSize = '20px';
    msg.style.color = 'red';
    msg.innerText = message.content;
    chatBox.appendChild(msg);
  } else if (message.type == 'usernameUpdate') {
    const chatBox = document.getElementById('chat');
    let msg = document.createElement('p');
    msg.style.fontSize = '10px';
    msg.innerText = "(" + message.old + ") changed their name to: (" + message.content + ")";
    chatBox.appendChild(msg);
  }
  scrollToBottom();
}

function scrollToBottom() {
  const chatDiv = document.getElementById('chat');
  if (chatDiv) {
    // scrollTop sets how far down the box is scrolled.
    // scrollHeight is the total height of all the text inside the box.
    chatDiv.scrollTop = chatDiv.scrollHeight;
  }
}

function sendAlert() {
  sendToClients({
    type: 'Alert',
    content: document.getElementById('alert').value,
  });
  processReq({
    type: 'Alert',
    content: document.getElementById('alert').value,
  });
}

function sendInfo() {
  sendToClients({
    type: 'Update',
    content: document.getElementById('info').value,
  });
  processReq({
    type: 'Update',
    content: document.getElementById('info').value,
  });
}

document.getElementById('msg').addEventListener('keydown', (e) => {
  if (!e.shiftKey) {
    if (e.key == 'Enter') {
      send();
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }
});

document.getElementById('name').addEventListener('change', (e) => {
  if (!hosting) {
    conn.send({"type": "usernameUpdate", "content": e.target.value, "old": username})
  } else {
    sendToClients({"type": "usernameUpdate", "content": e.target.value, "old": username})
    processReq({"type": "usernameUpdate", "content": e.target.value, "old": username})
  }
  username = e.target.value
});