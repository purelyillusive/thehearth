<script lang="ts">
	import { currentPlaylist } from '$lib/stores/socket';
	import { browser } from '$app/environment';

	// Tab state: 'spotify' | 'youtube'
	let activeTab = $state<'spotify' | 'youtube'>(
		browser ? (localStorage.getItem('hearth-media-tab') as 'spotify' | 'youtube') || 'spotify' : 'spotify'
	);
	let collapsed = $state(browser ? localStorage.getItem('hearth-player-collapsed') === 'true' : false);
	let expanded = $state(false);

	// YouTube state (stored locally)
	let youtubeUrl = $state(browser ? localStorage.getItem('hearth-youtube-url') || '' : '');
	let youtubeInput = $state('');
	let showYoutubeInput = $state(false);

	// Extract YouTube video or playlist embed URL
	function extractYoutubeEmbed(input: string): string | null {
		try {
			let videoId: string | null = null;
			let playlistId: string | null = null;

			// Handle youtu.be short links
			if (input.includes('youtu.be/')) {
				const match = input.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
				if (match) videoId = match[1];
			}
			// Handle youtube.com URLs
			else if (input.includes('youtube.com')) {
				const url = new URL(input);
				videoId = url.searchParams.get('v');
				playlistId = url.searchParams.get('list');
			}
			// Handle raw video ID (11 chars)
			else if (input.match(/^[a-zA-Z0-9_-]{11}$/)) {
				videoId = input;
			}
			// Handle raw playlist ID
			else if (input.match(/^PL[a-zA-Z0-9_-]+$/)) {
				playlistId = input;
			}

			// Build embed URL
			if (playlistId && videoId) {
				// Video within a playlist
				return `https://www.youtube.com/embed/${videoId}?list=${playlistId}`;
			} else if (playlistId) {
				// Playlist only
				return `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
			} else if (videoId) {
				// Single video
				return `https://www.youtube.com/embed/${videoId}`;
			}
		} catch {
			// Try as raw video ID
			if (input.match(/^[a-zA-Z0-9_-]{11}$/)) {
				return `https://www.youtube.com/embed/${input}`;
			}
		}
		return null;
	}

	function setYoutubeUrl() {
		const embedUrl = extractYoutubeEmbed(youtubeInput);
		if (embedUrl) {
			youtubeUrl = embedUrl;
			if (browser) {
				localStorage.setItem('hearth-youtube-url', embedUrl);
			}
			youtubeInput = '';
			showYoutubeInput = false;
		}
	}

	function toggleCollapsed() {
		// If expanded, minimize first
		if (expanded) {
			expanded = false;
		}
		collapsed = !collapsed;
		if (browser) {
			localStorage.setItem('hearth-player-collapsed', String(collapsed));
		}
	}

	function setTab(tab: 'spotify' | 'youtube') {
		activeTab = tab;
		if (browser) {
			localStorage.setItem('hearth-media-tab', tab);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			setYoutubeUrl();
		} else if (e.key === 'Escape') {
			showYoutubeInput = false;
			youtubeInput = '';
		}
	}
</script>

<div class="media-player" class:collapsed class:expanded={expanded && activeTab === 'youtube'}>
	{#if !collapsed}
		<div class="tabs">
			<button
				class="tab"
				class:active={activeTab === 'spotify'}
				onclick={() => setTab('spotify')}
			>
				spotify
			</button>
			<button
				class="tab"
				class:active={activeTab === 'youtube'}
				onclick={() => setTab('youtube')}
			>
				youtube
			</button>
		</div>

		<div class="player-content">
			{#if activeTab === 'spotify' && $currentPlaylist}
				<iframe
					title="Spotify Playlist"
					style="border-radius:8px"
					src={$currentPlaylist}
					width="100%"
					height="152"
					frameBorder="0"
					allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
					loading="lazy"
				></iframe>
			{:else if activeTab === 'youtube'}
				{#if youtubeUrl}
					<div class="youtube-wrapper">
						<iframe
							title="YouTube"
							style="border-radius:8px"
							src={youtubeUrl}
							width="100%"
							height={expanded ? "100%" : "152"}
							frameBorder="0"
							allow="autoplay; encrypted-media"
							allowfullscreen
						></iframe>
					</div>
					<button class="expand-btn" onclick={() => expanded = !expanded}>
						{expanded ? '↙ minimize' : '↗ expand'}
					</button>
				{/if}
				{#if showYoutubeInput}
					<div class="youtube-input-row">
						<input
							type="text"
							bind:value={youtubeInput}
							onkeydown={handleKeydown}
							placeholder="paste youtube url or video id..."
							class="youtube-input"
						/>
						<button class="set-btn" onclick={setYoutubeUrl}>set</button>
						<button class="cancel-btn" onclick={() => { showYoutubeInput = false; youtubeInput = ''; }}>x</button>
					</div>
				{:else}
					<button class="change-playlist-btn" onclick={() => showYoutubeInput = true}>
						{youtubeUrl ? 'change video' : 'add youtube video'}
					</button>
				{/if}
			{/if}
		</div>
	{/if}

	<button class="toggle-btn" onclick={toggleCollapsed}>
		{collapsed ? '♫ show player' : '− hide player'}
	</button>
</div>

<style>
	.media-player {
		position: absolute;
		top: 1rem;
		left: 1rem;
		right: 1rem;
		z-index: 15;
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.media-player.collapsed {
		right: auto;
	}

	.media-player.expanded {
		top: 0;
		left: 0;
		right: 0;
		bottom: 4rem;
		padding: 1rem;
		background: rgba(10, 10, 15, 0.95);
		z-index: 20;
	}

	.media-player.expanded .player-content {
		flex: 1;
		min-height: 0;
	}

	.media-player.expanded .youtube-wrapper {
		flex: 1;
		min-height: 0;
	}

	.tabs {
		display: flex;
		gap: 0.25rem;
	}

	.tab {
		padding: 0.25rem 0.75rem;
		background: rgba(10, 10, 15, 0.9);
		border: 1px solid var(--ash);
		border-bottom: none;
		border-radius: 4px 4px 0 0;
		color: var(--ash);
		font-family: var(--font-terminal);
		font-size: 0.7rem;
		cursor: pointer;
	}

	.tab:hover {
		color: var(--text-dim);
	}

	.tab.active {
		color: var(--ember);
		border-color: var(--ember);
		background: rgba(232, 165, 75, 0.1);
	}

	.player-content {
		background: rgba(10, 10, 15, 0.7);
		border-radius: 0 8px 8px 8px;
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.toggle-btn {
		align-self: flex-start;
		padding: 0.25rem 0.5rem;
		background: rgba(10, 10, 15, 0.9);
		border: 1px solid var(--ash);
		border-radius: 4px;
		color: var(--ash);
		font-family: var(--font-terminal);
		font-size: 0.7rem;
		cursor: pointer;
	}

	.toggle-btn:hover {
		border-color: var(--ember);
		color: var(--ember);
	}

	.youtube-input-row {
		display: flex;
		gap: 0.25rem;
	}

	.youtube-input {
		flex: 1;
		padding: 0.3rem 0.5rem;
		background: rgba(10, 10, 15, 0.9);
		border: 1px solid var(--ash);
		border-radius: 4px;
		color: var(--text-dim);
		font-family: var(--font-terminal);
		font-size: 0.7rem;
	}

	.youtube-input:focus {
		outline: none;
		border-color: var(--ember);
	}

	.youtube-input::placeholder {
		color: var(--ash);
	}

	.set-btn, .cancel-btn {
		padding: 0.3rem 0.5rem;
		background: rgba(10, 10, 15, 0.9);
		border: 1px solid var(--ash);
		border-radius: 4px;
		color: var(--ash);
		font-family: var(--font-terminal);
		font-size: 0.7rem;
		cursor: pointer;
	}

	.set-btn:hover {
		border-color: #ff0000;
		color: #ff0000;
	}

	.cancel-btn:hover {
		border-color: var(--text-dim);
		color: var(--text-dim);
	}

	.change-playlist-btn {
		padding: 0.3rem 0.5rem;
		background: transparent;
		border: 1px dashed var(--ash);
		border-radius: 4px;
		color: var(--ash);
		font-family: var(--font-terminal);
		font-size: 0.65rem;
		cursor: pointer;
		text-align: center;
	}

	.change-playlist-btn:hover {
		border-color: #ff0000;
		color: #ff0000;
	}

	.youtube-wrapper {
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.expand-btn {
		align-self: flex-end;
		padding: 0.2rem 0.4rem;
		background: transparent;
		border: 1px dashed var(--ash);
		border-radius: 4px;
		color: var(--ash);
		font-family: var(--font-terminal);
		font-size: 0.6rem;
		cursor: pointer;
	}

	.expand-btn:hover {
		border-color: #ff0000;
		color: #ff0000;
	}
</style>
