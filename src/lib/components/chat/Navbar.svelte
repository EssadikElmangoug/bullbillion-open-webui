<script lang="ts">
	import { getContext } from 'svelte';
	import { toast } from 'svelte-sonner';

	import {
		WEBUI_NAME,
		chatId,
		mobile,
		settings,
		showArchivedChats,
		showControls,
		showSidebar,
		temporaryChatEnabled,
		user
	} from '$lib/stores';

	import { slide } from 'svelte/transition';
	import { page } from '$app/stores';

	import ShareChatModal from '../chat/ShareChatModal.svelte';
	import ModelSelector from '../chat/ModelSelector.svelte';
	import Tooltip from '../common/Tooltip.svelte';
	import Menu from '$lib/components/layout/Navbar/Menu.svelte';
	import UserMenu from '$lib/components/layout/Sidebar/UserMenu.svelte';
	import MenuLines from '../icons/MenuLines.svelte';
	import AdjustmentsHorizontal from '../icons/AdjustmentsHorizontal.svelte';

	import PencilSquare from '../icons/PencilSquare.svelte';

	const i18n = getContext('i18n');

	export let initNewChat: Function;
	export let title: string = $WEBUI_NAME;
	export let shareEnabled: boolean = false;

	export let chat;
	export let selectedModels;
	export let showModelSelector = true;

	let showShareChatModal = false;
	let showDownloadChatModal = false;

	// Update title when route changes
	$: if ($page.url.pathname === '/') {
		title = 'New Chat';
	}
</script>

<ShareChatModal bind:show={showShareChatModal} chatId={$chatId} />

<nav class="sticky top-0 z-30 w-full px-1.5 py-1.5 -mb-8 flex items-center drag-region">
	<div
		class=" bg-gradient-to-b via-50% from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 dark:to-transparent pointer-events-none absolute inset-0 -bottom-7 z-[-1] blur"
	></div>

	<div class=" flex max-w-full w-full mx-auto px-1 pt-0.5 bg-transparent">
		<div class="flex items-center w-full max-w-full">
			<div
				class="{$showSidebar
					? 'md:hidden'
					: ''} mr-1 self-start flex flex-none items-center text-gray-600 dark:text-gray-400"
			>
				<button
					id="sidebar-toggle-button"
					class="cursor-pointer px-2 py-2 flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition"
					on:click={() => {
						showSidebar.set(!$showSidebar);
					}}
					aria-label="Toggle Sidebar"
				>
					<div class=" m-auto self-center">
						<MenuLines />
					</div>
					
				</button>
				<a
					id="sidebar-new-chat-button"
					class="flex justify-between items-center flex-1 rounded-xl px-2 py-2 h-full text-right hover:bg-gray-100 dark:hover:bg-gray-800 transition no-drag-region"
					href="/"
						draggable="false"
						on:click={async () => {
							selectedChatId = null;
							await goto('/');
							const newChatButton = document.getElementById('new-chat-button');
							setTimeout(() => {
								newChatButton?.click();
								if ($mobile) {
									showSidebar.set(false);
								}
							}, 0);
						}}
					>
						<PencilSquare />
				</a>
			</div>

			<div
				class="flex-1 overflow-hidden max-w-full py-0.5"
			>
				<!-- {#if showModelSelector}
					<ModelSelector bind:selectedModels showSetDefault={!shareEnabled} />
				{/if} -->
				<h1 class="font-bold text-2xl ml-1">BullBillion AI</h1>
			</div>

			<div class="absolute left-1/2 transform -translate-x-1/2 w-96 max-w-[calc(100%-200px)]">
				<input
					type="text"
					bind:value={title}
					class="w-full text-center bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg font-medium text-gray-800 dark:text-gray-200 transition-all"
					placeholder="Chat Title"
					readonly
				/>
			</div>
		</div>
	</div>
</nav>
