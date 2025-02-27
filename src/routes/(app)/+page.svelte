<script lang="ts">
	import Chat from '$lib/components/chat/Chat.svelte';
	import Help from '$lib/components/layout/Help.svelte';
	import { user } from '$lib/stores';

	console.log('this is the user', $user);
</script>

<!-- <Help /> -->
<Chat />
