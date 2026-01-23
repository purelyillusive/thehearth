<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { initSocket, getSocket, connected, username, userCount, isAuthenticated, onlineUsers } from '$lib/stores/socket';

	// Resizable chat height
	let chatHeight = $state(browser ? parseInt(localStorage.getItem('hearth-chat-height') || '280') : 280);
	let isResizing = $state(false);
	let containerEl: HTMLDivElement;

	function startResize(e: MouseEvent) {
		isResizing = true;
		e.preventDefault();
	}

	function onMouseMove(e: MouseEvent) {
		if (!isResizing || !containerEl) return;
		const containerRect = containerEl.parentElement?.getBoundingClientRect();
		if (!containerRect) return;
		const newHeight = containerRect.bottom - e.clientY;
		chatHeight = Math.max(150, Math.min(500, newHeight));
	}

	function onMouseUp() {
		if (isResizing) {
			isResizing = false;
			if (browser) {
				localStorage.setItem('hearth-chat-height', String(chatHeight));
			}
		}
	}

	interface Message {
		id: string;
		user: string;
		text: string;
		location: string;
		timestamp: string;
		isWhisper?: boolean;
		from?: string;
		to?: string;
		verified?: boolean;
		isSystem?: boolean;
		replyTo?: {
			id: string;
			user: string;
			text: string;
		};
	}

	const LOCATIONS = ['Global', 'North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'];

	let messages = $state<Message[]>([]);
	let selectedLocation = $state('Global');
	let inputText = $state('');
	let chatContainer: HTMLDivElement;
	let inputEl: HTMLInputElement;

	// @ mention autocomplete state
	let showMentions = $state(false);
	let mentionQuery = $state('');
	let mentionStart = $state(0);
	let selectedMentionIndex = $state(0);

	// Reply state
	let replyingTo = $state<Message | null>(null);

	// Filter online users based on mention query
	const filteredMentions = $derived(
		mentionQuery
			? $onlineUsers.filter(u =>
				u.toLowerCase().startsWith(mentionQuery.toLowerCase()) && u !== $username
			).slice(0, 5)
			: $onlineUsers.filter(u => u !== $username).slice(0, 5)
	);

	function scrollToBottom() {
		setTimeout(() => {
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		}, 10);
	}

	function sendMessage() {
		const socket = getSocket();
		if (!inputText.trim() || !socket || !$connected) return;

		const messageData: { text: string; replyTo?: { id: string; user: string; text: string } } = {
			text: inputText.trim(),
		};

		if (replyingTo) {
			messageData.replyTo = {
				id: replyingTo.id,
				user: replyingTo.user,
				text: replyingTo.text.slice(0, 100) // Truncate for embed
			};
		}

		socket.emit('chatMessage', messageData);

		inputText = '';
		replyingTo = null;
	}

	function startReply(msg: Message) {
		if (msg.isSystem) return;
		replyingTo = msg;
		inputEl?.focus();
	}

	function cancelReply() {
		replyingTo = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		// Handle mention autocomplete navigation
		if (showMentions && filteredMentions.length > 0) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedMentionIndex = (selectedMentionIndex + 1) % filteredMentions.length;
				return;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedMentionIndex = (selectedMentionIndex - 1 + filteredMentions.length) % filteredMentions.length;
				return;
			}
			if (e.key === 'Tab' || e.key === 'Enter') {
				e.preventDefault();
				selectMention(filteredMentions[selectedMentionIndex]);
				return;
			}
			if (e.key === 'Escape') {
				e.preventDefault();
				showMentions = false;
				return;
			}
		}

		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function handleInput() {
		const cursorPos = inputEl?.selectionStart || 0;
		const textBeforeCursor = inputText.slice(0, cursorPos);

		// Find @ symbol before cursor
		const atIndex = textBeforeCursor.lastIndexOf('@');
		if (atIndex !== -1) {
			// Check if @ is at start or preceded by space
			const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
			if (charBefore === ' ' || atIndex === 0) {
				const query = textBeforeCursor.slice(atIndex + 1);
				// Only show if no space in query (still typing username)
				if (!query.includes(' ')) {
					mentionStart = atIndex;
					mentionQuery = query;
					showMentions = true;
					selectedMentionIndex = 0;
					return;
				}
			}
		}
		showMentions = false;
	}

	function selectMention(user: string) {
		// Replace @query with @username
		const before = inputText.slice(0, mentionStart);
		const cursorPos = inputEl?.selectionStart || inputText.length;
		const after = inputText.slice(cursorPos);
		inputText = `${before}@${user} ${after}`;
		showMentions = false;

		// Move cursor after the inserted mention
		setTimeout(() => {
			const newPos = mentionStart + user.length + 2;
			inputEl?.setSelectionRange(newPos, newPos);
			inputEl?.focus();
		}, 0);
	}

	const filteredMessages = $derived(
		selectedLocation === 'Global'
			? messages
			: messages.filter(m => m.location === selectedLocation)
	);

	$effect(() => {
		const socket = getSocket();
		if (socket && $connected) {
			socket.emit('setLocation', selectedLocation);
		}
	});

	onMount(() => {
		initSocket();
		const socket = getSocket();
		if (!socket) return;

		// Load chat history when connecting
		socket.on('chatHistory', (history: Message[]) => {
			messages = history;
			scrollToBottom();
		});

		socket.on('chatMessage', (msg: Message) => {
			messages = [...messages, msg];
			if (messages.length > 100) {
				messages = messages.slice(-100);
			}
			scrollToBottom();
		});

		// Handle whispers (private messages)
		socket.on('whisper', (msg: Message) => {
			const whisperMessage: Message = {
				...msg,
				user: msg.from || 'unknown',
				isWhisper: true
			};
			messages = [...messages, whisperMessage];
			if (messages.length > 100) {
				messages = messages.slice(-100);
			}
			scrollToBottom();
		});

		socket.on('error', (err: string) => {
			console.error('Chat error:', err);
		});
	});
</script>

<svelte:window onmousemove={onMouseMove} onmouseup={onMouseUp} />

<div class="chat-container" bind:this={containerEl} style="height: {chatHeight}px">
	<div class="resize-handle" onmousedown={startResize} title="Drag to resize"></div>
	<div class="chat-header">
		<div class="header-row">
			<select bind:value={selectedLocation} class="location-select">
				{#each LOCATIONS as loc}
					<option value={loc}>{loc}</option>
				{/each}
			</select>
			<span class="status" class:connected={$connected}>
				{$connected ? $userCount + ' online' : 'connecting...'}
			</span>
			{#if $isAuthenticated}
				<span class="logged-in-user">
					<span class="verified-badge">✓</span>{$username}
				</span>
				<a href="/auth/logout" class="auth-btn logout">logout</a>
			{:else}
				<a href="/auth/discord" class="auth-btn login">discord</a>
			{/if}
		</div>
	</div>

	<div class="chat-messages" bind:this={chatContainer}>
		{#each filteredMessages as msg (msg.id)}
			<div
				class="message"
				class:whisper={msg.isWhisper}
				class:system={msg.isSystem}
				onclick={() => startReply(msg)}
			>
				{#if msg.replyTo}
					<div class="reply-quote">
						<span class="reply-user">@{msg.replyTo.user}</span>
						<span class="reply-text">{msg.replyTo.text}</span>
					</div>
				{/if}
				{#if msg.isSystem}
					<span class="system-text">{msg.text}</span>
				{:else if msg.isWhisper}
					<span class="whisper-label">[whisper]</span>
					<span class="user whisper-user">
						{msg.from === $username ? `to ${msg.to}` : `from ${msg.from}`}
					</span>
					<span class="text">{msg.text}</span>
				{:else}
					<span class="user" class:verified={msg.verified}>{msg.user}</span>
					{#if msg.verified}<span class="verified-badge" title="Discord verified">✓</span>{/if}
					<span class="text">{msg.text}</span>
				{/if}
			</div>
		{/each}
		{#if filteredMessages.length === 0}
			<div class="empty-chat">no messages yet...</div>
		{/if}
	</div>

	<div class="chat-input">
		{#if replyingTo}
			<div class="reply-indicator">
				<span class="reply-indicator-text">replying to <strong>{replyingTo.user}</strong></span>
				<button class="reply-cancel" onclick={cancelReply}>×</button>
			</div>
		{/if}
		{#if showMentions && filteredMentions.length > 0}
			<div class="mention-dropdown">
				{#each filteredMentions as user, i}
					<button
						class="mention-option"
						class:selected={i === selectedMentionIndex}
						onclick={() => selectMention(user)}
						onmouseenter={() => selectedMentionIndex = i}
					>
						@{user}
					</button>
				{/each}
			</div>
		{/if}
		<input
			type="text"
			bind:this={inputEl}
			bind:value={inputText}
			onkeydown={handleKeydown}
			oninput={handleInput}
			placeholder={$connected ? `${$username}: say something...` : 'connecting...'}
			disabled={!$connected}
		/>
	</div>
</div>

<style>
	.chat-container {
		display: flex;
		flex-direction: column;
		background: rgba(10, 10, 15, 0.9);
		border-top: 1px solid var(--ash);
		position: relative;
	}

	.resize-handle {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 6px;
		cursor: ns-resize;
		background: transparent;
		z-index: 10;
	}

	.resize-handle:hover {
		background: linear-gradient(180deg, var(--ember-dim) 0%, transparent 100%);
	}

	.chat-header {
		padding: 0.5rem;
		border-bottom: 1px solid var(--ash);
	}

	.header-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status {
		font-family: var(--font-terminal);
		font-size: 0.75rem;
		color: var(--ash);
		white-space: nowrap;
	}

	.status.connected {
		color: var(--ember);
	}

	.auth-btn {
		font-family: var(--font-terminal);
		font-size: 0.7rem;
		padding: 0.2rem 0.5rem;
		border: 1px solid var(--ash);
		text-decoration: none;
		white-space: nowrap;
	}

	.auth-btn.login {
		color: #7289da;
		border-color: #7289da;
	}

	.auth-btn.login:hover {
		background: rgba(114, 137, 218, 0.2);
	}

	.auth-btn.logout {
		color: var(--ash);
	}

	.auth-btn.logout:hover {
		color: var(--text-dim);
		border-color: var(--text-dim);
	}

	.logged-in-user {
		font-family: var(--font-terminal);
		font-size: 0.75rem;
		color: #7289da;
		white-space: nowrap;
	}

	.empty-chat {
		font-family: var(--font-terminal);
		font-size: 0.85rem;
		color: var(--ash);
		text-align: center;
		padding: 1rem;
	}

	.location-select {
		flex: 1;
		padding: 0.4rem;
		background: var(--bg-deep);
		border: 1px solid var(--ash);
		color: var(--text-dim);
		font-family: var(--font-terminal);
		font-size: 0.85rem;
		cursor: pointer;
	}

	.location-select:focus {
		outline: none;
		border-color: var(--ember);
	}

	.chat-messages {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.message {
		font-family: var(--font-terminal);
		font-size: 0.85rem;
		line-height: 1.3;
	}

	.user {
		color: var(--ember);
		margin-right: 0.5rem;
	}

	.user::after {
		content: ':';
	}

	.user.verified {
		color: #7289da;
	}

	.verified-badge {
		color: #7289da;
		font-size: 0.7rem;
		margin-right: 0.3rem;
	}

	.text {
		color: var(--text-dim);
	}

	.message.whisper {
		background: rgba(138, 100, 200, 0.1);
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		margin: 0.1rem -0.4rem;
	}

	.message.system {
		font-style: italic;
	}

	.system-text {
		color: var(--ash);
		font-size: 0.8rem;
	}

	.whisper-label {
		color: #a78bfa;
		font-size: 0.75rem;
		margin-right: 0.3rem;
	}

	.whisper-user {
		color: #a78bfa;
	}

	.chat-input {
		position: relative;
		padding: 0.5rem;
		border-top: 1px solid var(--ash);
	}

	.chat-input input {
		width: 100%;
		padding: 0.5rem;
		background: var(--bg-deep);
		border: 1px solid var(--ash);
		color: var(--text);
		font-family: var(--font-terminal);
		font-size: 0.85rem;
	}

	.chat-input input:focus {
		outline: none;
		border-color: var(--ember);
	}

	.chat-input input::placeholder {
		color: var(--ash);
	}

	.mention-dropdown {
		position: absolute;
		bottom: 100%;
		left: 0.5rem;
		right: 0.5rem;
		background: var(--bg-deep);
		border: 1px solid var(--ash);
		border-bottom: none;
		border-radius: 4px 4px 0 0;
		max-height: 150px;
		overflow-y: auto;
	}

	.mention-option {
		display: block;
		width: 100%;
		padding: 0.4rem 0.6rem;
		background: transparent;
		border: none;
		color: var(--text-dim);
		font-family: var(--font-terminal);
		font-size: 0.8rem;
		text-align: left;
		cursor: pointer;
	}

	.mention-option:hover,
	.mention-option.selected {
		background: rgba(232, 165, 75, 0.2);
		color: var(--ember);
	}

	/* Reply styles */
	.message {
		cursor: pointer;
	}

	.message:hover:not(.system) {
		background: rgba(232, 165, 75, 0.05);
		margin: 0.1rem -0.3rem;
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
	}

	.reply-quote {
		font-size: 0.75rem;
		padding: 0.2rem 0.4rem;
		margin-bottom: 0.2rem;
		border-left: 2px solid var(--ash);
		background: rgba(255, 255, 255, 0.03);
		border-radius: 0 3px 3px 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.reply-user {
		color: var(--ember-dim);
		margin-right: 0.4rem;
	}

	.reply-text {
		color: var(--ash);
	}

	.reply-indicator {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.3rem 0.5rem;
		background: rgba(232, 165, 75, 0.1);
		border-left: 2px solid var(--ember);
		margin-bottom: 0.3rem;
		border-radius: 0 3px 3px 0;
	}

	.reply-indicator-text {
		font-family: var(--font-terminal);
		font-size: 0.75rem;
		color: var(--text-dim);
	}

	.reply-indicator-text strong {
		color: var(--ember);
	}

	.reply-cancel {
		background: transparent;
		border: none;
		color: var(--ash);
		font-size: 1rem;
		cursor: pointer;
		padding: 0 0.3rem;
		line-height: 1;
	}

	.reply-cancel:hover {
		color: var(--ember);
	}
</style>
