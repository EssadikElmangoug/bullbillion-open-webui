<script>
  import { getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { WEBUI_BASE_URL } from '$lib/constants';
  import { sendPasswordResetEmail, auth } from '$lib/firebase';
  const i18n = getContext('i18n');

  let email = '';
  let loading = false;
  let submitted = false;
  let token = $page.url.searchParams.get('token');
  let newPassword = '';
  let error = '';
  let message = '';
  async function handleResetRequest() {
    loading = true;
    error = '';
    try {
      const res = await sendPasswordResetEmail(auth, email);
      
      message = 'Email sent! please check your email inbox.';
      submitted = true;
    } catch (err) {
      error = 'An unexpected error occurred';
    } finally {
      loading = false;  
    }
  }

</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
  <div class="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
    <div class="text-center">
      <img src="/static/bullbillion.png" alt="BullBillion Logo" class="mx-auto h-12 w-auto mb-4" />
      <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
        {token ? 'Reset Password' : 'Forgot Password'}
      </h1>
      
      {#if error}
        <div class="mt-4 rounded-md bg-red-50 p-4 dark:bg-red-900/50">
          <p class="text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      {/if}
    </div>

    {#if !token}
      {#if !submitted}
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        <form on:submit|preventDefault={handleResetRequest} class="mt-8 space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <input
              id="email"
              type="email"
              bind:value={email}
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Enter your email"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:hover:bg-blue-700"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      {:else}
        <div class="mt-6 rounded-md bg-blue-50 p-4 dark:bg-blue-900/50">
          <p class="text-sm text-blue-700 dark:text-blue-200">
            {message}
          </p>
        </div>
      {/if}
    {:else}
      <form on:submit|preventDefault={handlePasswordReset} class="mt-8 space-y-6">
        <div>
          <label for="new-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            bind:value={newPassword}
            required
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="Enter new password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:hover:bg-blue-700"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    {/if}
    
    <div class="text-center">
      <a
        href="/auth"
        class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Back to Login
      </a>
    </div>
  </div>
</div>
