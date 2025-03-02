<script>
  import { onMount, getContext } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Trash } from 'lucide-svelte';
  import { WEBUI_BASE_URL } from "$lib/constants";

  const i18n = getContext('i18n');

  let affiliates = [];
  let newAffiliate = { name: '', link: '' };
  let loading = false;
  let saving = false;

  onMount(async () => {
    await loadAffiliates();
  });

  async function loadAffiliates() {
    loading = true;
    try {
      const response = await fetch(`${WEBUI_BASE_URL}/api/v1/auths/affiliates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to load affiliate programs');
      }
      
      const data = await response.json();
      affiliates = data.affiliates || [];
    } catch (error) {
      toast.error($i18n.t('Failed to load affiliate programs'));
      console.error('Error loading affiliates:', error);
    } finally {
      loading = false;
    }
  }

  async function handleAddAffiliate() {
    if (!newAffiliate.name || !newAffiliate.link) {
      toast.error($i18n.t('Both name and link are required'));
      return;
    }

    // Check if name already exists
    if (affiliates.some(a => a.name === newAffiliate.name)) {
      toast.error($i18n.t('An affiliate program with this name already exists'));
      return;
    }

    saving = true;
    try {
      const response = await fetch(`${WEBUI_BASE_URL}/api/v1/auths/affiliates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAffiliate),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add affiliate program');
      }
      
      toast.success($i18n.t('Affiliate program added successfully'));
      
      // Add to local list
      affiliates = [...affiliates, { ...newAffiliate }];
      
      // Reset form
      newAffiliate = { name: '', link: '' };
    } catch (error) {
      toast.error($i18n.t('Failed to add affiliate program'));
      console.error('Error adding affiliate:', error);
    } finally {
      saving = false;
    }
  }

  async function handleDeleteAffiliate(name) {
    try {
      const response = await fetch(`${WEBUI_BASE_URL}/api/v1/auths/affiliates/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete affiliate program');
      }
      
      toast.success($i18n.t('Affiliate program deleted successfully'));
      
      // Remove from local list
      affiliates = affiliates.filter(a => a.name !== name);
    } catch (error) {
      toast.error($i18n.t('Failed to delete affiliate program'));
      console.error('Error deleting affiliate:', error);
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h3 class="text-lg font-medium">{$i18n.t('Affiliate Programs')}</h3>
    <p class="text-sm text-muted-foreground dark:text-gray-400">
      {$i18n.t('Manage your affiliate programs. Add, edit, or remove affiliate links.')}
    </p>
  </div>

  <div class="space-y-6">
    <div class="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <h4 class="text-base font-medium mb-4">{$i18n.t('Add New Affiliate Program')}</h4>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {$i18n.t('Program Name')}
          </label>
          <input 
            id="name" 
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            bind:value={newAffiliate.name} 
            placeholder={$i18n.t('Amazon Associates')}
          />
        </div>
        <div class="space-y-2">
          <label for="link" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {$i18n.t('Affiliate Link')}
          </label>
          <input 
            id="link" 
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            bind:value={newAffiliate.link} 
            placeholder="https://affiliate.example.com/ref=12345"
          />
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button 
          on:click={handleAddAffiliate} 
          disabled={saving}
          class="inline-flex justify-center items-center px-4 py-2 border border-transparent 
                rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-400
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? $i18n.t('Adding...') : $i18n.t('Add Affiliate Program')}
        </button>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-base font-medium">{$i18n.t('Your Affiliate Programs')}</h4>
      </div>
      
      {#if loading}
        <div class="py-8 text-center text-gray-500 dark:text-gray-400">
          <svg class="animate-spin h-6 w-6 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {$i18n.t('Loading affiliate programs...')}
        </div>
      {:else if affiliates.length === 0}
        <div class="py-8 text-center text-gray-500 dark:text-gray-400">
          {$i18n.t('No affiliate programs added yet.')}
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {$i18n.t('Program Name')}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {$i18n.t('Affiliate Link')}
                </th>
                <th scope="col" class="relative px-6 py-3">
                  <span class="sr-only">{$i18n.t('Actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {#each affiliates as affiliate}
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {affiliate.name}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 break-all">
                    <a href={affiliate.link} target="_blank" rel="noopener noreferrer" 
                       class="text-blue-600 dark:text-blue-400 hover:underline">
                      {affiliate.link}
                    </a>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      on:click={() => handleDeleteAffiliate(affiliate.name)}
                      class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 focus:outline-none"
                      aria-label={$i18n.t('Delete')}
                    >
                      <Trash class="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div> 