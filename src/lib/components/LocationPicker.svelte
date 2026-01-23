<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getSocket, connected, selectedCity } from '$lib/stores/socket';

	let inputValue = $state('');
	let suggestions = $state<Array<{name: string, lng: number, lat: number}>>([]);
	let showSuggestions = $state(false);
	let isSearching = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	// Popular cities for quick selection
	const popularCities = [
		{ name: 'San Francisco', lng: -122.4, lat: 37.8 },
		{ name: 'New York', lng: -74.0, lat: 40.7 },
		{ name: 'London', lng: -0.1, lat: 51.5 },
		{ name: 'Tokyo', lng: 139.7, lat: 35.7 },
		{ name: 'Berlin', lng: 13.4, lat: 52.5 },
		{ name: 'Sydney', lng: 151.2, lat: -33.9 },
	];

	onMount(() => {
		if (browser) {
			const saved = localStorage.getItem('hearth-location-name');
			if (saved) {
				inputValue = saved;
			}
		}
	});

	async function searchLocation(query: string) {
		if (query.length < 2) {
			suggestions = [];
			return;
		}

		isSearching = true;
		try {
			// Use Nominatim (OpenStreetMap) for geocoding - works with cities, zipcodes, etc.
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
				{ headers: { 'User-Agent': 'Hearth App' } }
			);
			const data = await response.json();

			suggestions = data.map((item: any) => ({
				name: item.display_name.split(',').slice(0, 2).join(','),
				lng: parseFloat(item.lon),
				lat: parseFloat(item.lat)
			}));
		} catch (err) {
			console.error('Geocoding error:', err);
			suggestions = [];
		}
		isSearching = false;
	}

	function handleInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		inputValue = value;
		showSuggestions = true;

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => searchLocation(value), 300);
	}

	function selectLocation(loc: {name: string, lng: number, lat: number}) {
		const socket = getSocket();
		if (socket) {
			socket.emit('setCoords', { lng: loc.lng, lat: loc.lat });
			inputValue = loc.name;
			selectedCity.set(loc.name);
			if (browser) {
				localStorage.setItem('hearth-location-name', loc.name);
			}
		}
		showSuggestions = false;
		suggestions = [];
	}

	function handleFocus() {
		if (inputValue.length < 2) {
			suggestions = popularCities;
		}
		showSuggestions = true;
	}

	function handleBlur() {
		// Delay to allow click on suggestion
		setTimeout(() => {
			showSuggestions = false;
		}, 200);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && suggestions.length > 0) {
			selectLocation(suggestions[0]);
		} else if (e.key === 'Escape') {
			showSuggestions = false;
		}
	}
</script>

<div class="location-picker">
	<label>
		<span class="label-text">coding from</span>
		<div class="input-wrapper">
			<input
				type="text"
				value={inputValue}
				oninput={handleInput}
				onfocus={handleFocus}
				onblur={handleBlur}
				onkeydown={handleKeydown}
				placeholder="city or zipcode..."
				disabled={!$connected}
			/>
			{#if isSearching}
				<span class="spinner">...</span>
			{/if}
		</div>
	</label>

	{#if showSuggestions && suggestions.length > 0}
		<ul class="suggestions">
			{#each suggestions as loc}
				<li>
					<button type="button" onmousedown={() => selectLocation(loc)}>
						{loc.name}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.location-picker {
		position: absolute;
		bottom: 0.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 20;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-terminal);
		font-size: 0.8rem;
	}

	.label-text {
		color: var(--text-dim);
	}

	.input-wrapper {
		position: relative;
	}

	input {
		width: 160px;
		padding: 0.3rem 0.5rem;
		background: rgba(10, 10, 15, 0.9);
		border: 1px solid var(--ash);
		color: var(--ember);
		font-family: var(--font-terminal);
		font-size: 0.8rem;
	}

	input:focus {
		outline: none;
		border-color: var(--ember);
	}

	input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	input::placeholder {
		color: var(--ash);
	}

	.spinner {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--ash);
	}

	.suggestions {
		position: absolute;
		bottom: 100%;
		left: 0;
		right: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		background: rgba(10, 10, 15, 0.95);
		border: 1px solid var(--ash);
		border-bottom: none;
		max-height: 200px;
		overflow-y: auto;
	}

	.suggestions li {
		margin: 0;
		padding: 0;
	}

	.suggestions button {
		width: 100%;
		padding: 0.4rem 0.5rem;
		background: none;
		border: none;
		border-bottom: 1px solid var(--ash);
		color: var(--text-dim);
		font-family: var(--font-terminal);
		font-size: 0.75rem;
		text-align: left;
		cursor: pointer;
	}

	.suggestions button:hover {
		background: rgba(232, 165, 75, 0.1);
		color: var(--ember);
	}
</style>
