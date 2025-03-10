<script lang="ts">
    import { createEventDispatcher, getContext } from 'svelte';
    import { goto } from '$app/navigation';
    import { toast } from 'svelte-sonner';
    
    import { getBackendConfig } from '$lib/apis';
    import { ldapUserSignIn, getSessionUser } from '$lib/apis/auths';
    import { config, user, socket } from '$lib/stores';
    import { generateInitialsImage } from '$lib/utils';
    import { WEBUI_BASE_URL } from '$lib/constants';
    
    // Import Firebase authentication functions
    import { 
        auth, 
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle
    } from '$lib/firebase';

    const dispatch = createEventDispatcher();
    const i18n = getContext('i18n');

    export let mode: 'signin' | 'signup' | 'ldap' = $config?.features.enable_ldap ? 'ldap' : 'signin';
    export let show = false;

    let loading = false;
    let name = '';
    let email = '';
    let password = '';
    let ldapUsername = '';
    let formMessage = { type: '', text: '' };

    const setSessionUser = async (sessionUser) => {
        if (sessionUser) {
            formMessage = { type: 'success', text: $i18n.t(`You're now logged in.`) };
            if (sessionUser.token) {
                localStorage.token = sessionUser.token;
            }

            $socket.emit('user-join', { auth: { token: sessionUser.token } });
            await user.set(sessionUser);
            await config.set(await getBackendConfig());
            
            dispatch('success');
            show = false;
        }
    };

    const signInHandler = async () => {
        loading = true;
        
        try {
            const firebaseUser = await signInWithEmail(email, password);
            await setSessionUser(firebaseUser);
        } catch (error) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('user-not-found') || errorMessage.includes('wrong-password')) {
                formMessage = { type: 'error', text: $i18n.t('Invalid email or password') };
            } else {
                formMessage = { type: 'error', text: $i18n.t('Sign in failed. Please try again.') };
            }
        } finally {
            loading = false;
        }
    };

    const signUpHandler = async () => {
        loading = true;
        
        try {
            const firebaseUser = await signUpWithEmail(name, email, password);
            await setSessionUser(firebaseUser);
        } catch (error) {
            const errorMessage = error.toString().toLowerCase();
            if (errorMessage.includes('email already registered')) {
                formMessage = { type: 'error', text: $i18n.t('This email is already registered') };
            } else if (errorMessage.includes('invalid email')) {
                formMessage = { type: 'error', text: $i18n.t('Please enter a valid email address') };
            } else {
                formMessage = { type: 'error', text: $i18n.t('Sign up failed. Please try again.') };
            }
        } finally {
            loading = false;
        }
    };

    const ldapSignInHandler = async () => {
        loading = true;
        const sessionUser = await ldapUserSignIn(ldapUsername, password).catch((error) => {
            formMessage = { type: 'error', text: `${error}` };
            return null;
        });
        loading = false;
        await setSessionUser(sessionUser);
    };

    const submitHandler = async () => {
        if (mode === 'ldap') {
            await ldapSignInHandler();
        } else if (mode === 'signin') {
            await signInHandler();
        } else {
            await signUpHandler();
        }
    };

    const handleClose = () => {
        show = false;
        dispatch('close');
    };

    const handleGoogleSignIn = async () => {
        try {
            const user = await signInWithGoogle();
            await setSessionUser(user);
            toast.success($i18n.t('Successfully signed in with Google'));
        } catch (error) {
            console.error("Google sign-in failed:", error);
            toast.error($i18n.t('Google sign-in failed'));
        }
    };

    const checkOauthCallback = async () => {
        if (!window.location.hash) {
            return;
        }
        const hash = window.location.hash.substring(1);
        if (!hash) {
            return;
        }
        const params = new URLSearchParams(hash);
        const token = params.get('token');
        if (!token) {
            return;
        }
        const sessionUser = await getSessionUser(token).catch((error) => {
            formMessage = { type: 'error', text: `${error}` };
            return null;
        });
        if (!sessionUser) {
            return;
        }
        await setSessionUser(sessionUser);
    };
</script>

{#if show}
    <div class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" on:click={handleClose}></div>
        
        <!-- Modal -->
        <div class="relative z-10 w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
            <div class="text-center">
                <img src="/static/bullbillion.png" alt="BullBillion Logo" class="mx-auto h-12 w-auto mb-4" />
                <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {#if mode === 'ldap'}
                        {$i18n.t('Sign in to BullBillion with LDAP')}
                    {:else if mode === 'signin'}
                        {$i18n.t('Sign in to BullBillion')}
                    {:else}
                        {$i18n.t('Sign up to BullBillion')}
                    {/if}
                </h1>

                {#if formMessage.text}
                    <div class="mt-4 rounded-md p-4 {formMessage.type === 'error' ? 'bg-red-50 dark:bg-red-900/50' : 'bg-green-50 dark:bg-green-900/50'}">
                        <p class="text-sm {formMessage.type === 'error' ? 'text-red-700 dark:text-red-200' : 'text-green-700 dark:text-green-200'}">{formMessage.text}</p>
                    </div>
                {/if}
            </div>

            <form on:submit|preventDefault={submitHandler} class="mt-8 space-y-6">
                {#if mode === 'signup'}
                    <div>
                        <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {$i18n.t('Name')}
                        </label>
                        <input
                            id="name"
                            bind:value={name}
                            type="text"
                            required
                            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder={$i18n.t('Enter Your Full Name')}
                        />
                    </div>
                {/if}

                {#if mode === 'ldap'}
                    <div>
                        <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {$i18n.t('Username')}
                        </label>
                        <input
                            id="username"
                            bind:value={ldapUsername}
                            type="text"
                            required
                            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder={$i18n.t('Enter Your Username')}
                        />
                    </div>
                {:else}
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {$i18n.t('Email')}
                        </label>
                        <input
                            id="email"
                            bind:value={email}
                            type="email"
                            required
                            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder={$i18n.t('Enter Your Email')}
                        />
                    </div>
                {/if}

                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {$i18n.t('Password')}
                    </label>
                    <input
                        id="password"
                        bind:value={password}
                        type="password"
                        required
                        class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder={$i18n.t('Enter Your Password')}
                    />
                    {#if mode === 'signin'}
                        <div class="mt-2 text-right">
                            <a
                                href="/auth/reset-password"
                                class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                {$i18n.t('Forgot your password?')}
                            </a>
                        </div>
                    {/if}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:hover:bg-blue-700"
                >
                    {#if loading}
                        {$i18n.t('Loading...')}
                    {:else}
                        {mode === 'signin' ? $i18n.t('Sign in') : $i18n.t('Create Account')}
                    {/if}
                </button>
            </form>

            <!-- OAuth providers section -->
            {#if $config?.oauth?.providers?.google}
                <div class="relative mt-6">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-gray-300 dark:border-gray-600" />
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">{$i18n.t('or')}</span>
                    </div>
                </div>

                <div class="mt-6">
                    <button
                        class="flex justify-center items-center bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm p-2.5 sm:p-3 w-full"
                        on:click={handleGoogleSignIn}
                        aria-label="Sign in with Google"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="size-5 sm:size-6 mr-2">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        <span class="text-sm font-medium">{$i18n.t('Continue with Google')}</span>
                    </button>
                </div>
            {/if}

            {#if $config?.features.enable_signup}
                <div class="text-center text-sm text-gray-600 dark:text-gray-400">
                    {mode === 'signin'
                        ? $i18n.t("Don't have an account?")
                        : $i18n.t('Already have an account?')}
                    <button
                        type="button"
                        class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                        on:click={() => mode = mode === 'signin' ? 'signup' : 'signin'}
                    >
                        {mode === 'signin' ? $i18n.t('Sign up') : $i18n.t('Sign in')}
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if} 