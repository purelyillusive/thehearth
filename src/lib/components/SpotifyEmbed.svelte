<script lang="ts">
	import { currentPlaylist } from '$lib/stores/socket';
	import { browser } from '$app/environment';

	let collapsed = $state(browser ? localStorage.getItem('hearth-player-collapsed') === 'true' : false);

	function toggle() {
		collapsed = !collapsed;
		if (browser) {
			localStorage.setItem('hearth-player-collapsed', String(collapsed));
		}
	}
</script>

{#if $currentPlaylist}
	<div class="spotify-embed" class:collapsed>
		{#if !collapsed}
			<iframe
				title="Spotify Playlist"
				style="border-radius:12px"
				src={$currentPlaylist}
				width="100%"
				height="152"
				frameBorder="0"
				allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
				loading="lazy"
			></iframe>
		{/if}
		<button class="toggle-btn" onclick={toggle} title={collapsed ? 'Show player' : 'Hide player'}>
			{collapsed ? '♫ show player' : '− hide player'}
		</button>
	</div>
{/if}

<style>
	.spotify-embed {
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

	.spotify-embed.collapsed {
		right: auto;
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
</style>
