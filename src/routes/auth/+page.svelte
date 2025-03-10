<script>
	import { toast } from 'svelte-sonner';

	import { onMount, getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	import { getBackendConfig } from '$lib/apis';
	import { ldapUserSignIn, getSessionUser, userSignIn, userSignUp } from '$lib/apis/auths';

	import { WEBUI_API_BASE_URL, WEBUI_BASE_URL } from '$lib/constants';
	import { WEBUI_NAME, config, user, socket } from '$lib/stores';

	import { generateInitialsImage, canvasPixelTest } from '$lib/utils';

	import { 
		auth, 
		signInWithEmail, 
		signUpWithEmail,
		signInWithGoogle,
		signInWithFacebook,
		initRecaptchaVerifier,
		sendOtpToPhone,
		verifyOtp 
	} from '$lib/firebase';

	import Spinner from '$lib/components/common/Spinner.svelte';
	import OnBoarding from '$lib/components/OnBoarding.svelte';

	const i18n = getContext('i18n');

	let loaded = false;
	let loading = false;
	let error = '';
	let mode = $config?.features.enable_ldap ? 'ldap' : 'signin';

	let name = '';
	let email = '';
	let password = '';

	let ldapUsername = '';

	let formMessage = { type: '', text: '' };

	let showPhoneAuth = false;
	let phoneNumber = '';
	let otpCode = '';
	let otpSent = false;
	let phoneAuthLoading = false;

	let confirmationResult = null;
	let recaptchaVerifier = null;

	const querystringValue = (key) => {
		const querystring = window.location.search;
		const urlParams = new URLSearchParams(querystring);
		return urlParams.get(key);
	};

	const setSessionUser = async (sessionUser) => {
		if (sessionUser) {
			console.log('sessionUser', sessionUser);
			formMessage = { type: 'success', text: $i18n.t(`You're now logged in.`) };
			if (sessionUser.token) {
				localStorage.token = sessionUser.token;
			}

			$socket.emit('user-join', { auth: { token: sessionUser.token } });
			await user.set(sessionUser);
			await config.set(await getBackendConfig());
			window.location.href = '/';

			// const redirectPath = querystringValue('redirect') || '/';
			// goto(redirectPath);
		}
	};

	const signInHandler = async () => {
		const firebaseUser = await signInWithEmail(email, password).catch(
			(error) => {
				const errorMessage = error.message.toLowerCase();
				if (errorMessage.includes('user-not-found') || errorMessage.includes('wrong-password')) {
					formMessage = { type: 'error', text: $i18n.t('Invalid email or password') };
				} else {
					formMessage = { type: 'error', text: $i18n.t('Sign in failed. Please try again.') };
				}
				return null;
			}
		);
		await setSessionUser(firebaseUser);

		// if (firebaseUser) {
		// 	try {
		// 		// Call your backend signin endpoint
		// 		const response = await fetch(`${WEBUI_API_BASE_URL}/auths/signin`, {
		// 			method: 'POST',
		// 			headers: {
		// 				'Content-Type': 'application/json',
		// 			},
		// 			body: JSON.stringify({
		// 				email: email,
		// 				password: password
		// 			})
		// 		});

		// 		if (!response.ok) {
		// 			const errorData = await response.json();
		// 			throw new Error(errorData.detail || 'Failed to authenticate with backend');
		// 		}

		// 		const backendUser = await response.json();
				
		// 		formMessage = { type: 'success', text: $i18n.t('Successfully signed in') };
				
		// 		// Combine Firebase user with backend user data
		// 		await setSessionUser(backendUser);
		// 	} catch (error) {
		// 		console.error('Backend signin error:', error);
		// 		formMessage = { 
		// 			type: 'error', 
		// 			text: $i18n.t('Signed in with Firebase but failed to sync with backend. Please try again.') 
		// 		};
		// 	}
		// }
	};

	const signUpHandler = async () => {
		const firebaseUser = await signUpWithEmail(name, email, password).catch(
			(error) => {
				const errorMessage = error.toLowerCase();
				if (errorMessage.includes('email already registered')) {
					formMessage = { type: 'error', text: $i18n.t('This email is already registered') };
				} else if (errorMessage.includes('invalid email')) {
					formMessage = { type: 'error', text: $i18n.t('Please enter a valid email address') };
				} else {
					formMessage = { type: 'error', text: $i18n.t('Sign up failed. Please try again.') };
				}
				return null;
			}
		);
		await setSessionUser(firebaseUser);

		// if (firebaseUser) {
		// 	try {
		// 		// Call your backend signup endpoint
		// 		const response = await fetch(`${WEBUI_API_BASE_URL}/auths/signup`, {
		// 			method: 'POST',
		// 			headers: {
		// 				'Content-Type': 'application/json',
		// 			},
		// 			body: JSON.stringify({
		// 				email: email,
		// 				password: password,
		// 				name: name
		// 			})
		// 		});

		// 		if (!response.ok) {
		// 			const errorData = await response.json();
		// 			throw new Error(errorData.detail || 'Failed to create user in backend');
		// 		}

		// 		const backendUser = await response.json();
				
		// 		formMessage = { type: 'success', text: $i18n.t('Account created successfully') };
				
		// 		// You might want to combine the Firebase user and backend user data
		// 		await setSessionUser(backendUser);
		// 	} catch (error) {
		// 		console.error('Backend signup error:', error);
				
		// 		// Consider if you want to delete the Firebase user if backend creation fails
		// 		// await deleteUser(firebaseUser.user);
				
		// 		formMessage = { 
		// 			type: 'error', 
		// 			text: $i18n.t('Account created in Firebase but failed to sync with backend. Please contact support.') 
		// 		};
		// 	}
		// }
	};

	const ldapSignInHandler = async () => {
		const sessionUser = await ldapUserSignIn(ldapUsername, password).catch((error) => {
			const errorMessage = error.toLowerCase();
			if (errorMessage.includes('invalid credentials')) {
				formMessage = { type: 'error', text: $i18n.t('Invalid username or password') };
			} else {
				formMessage = { type: 'error', text: $i18n.t('LDAP sign in failed. Please try again.') };
			}
			return null;
		});

		if (sessionUser) {
			formMessage = { type: 'success', text: $i18n.t('Successfully signed in') };
			await setSessionUser(sessionUser);
		}
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

	const checkOauthCallback = async () => {
		if (!$page.url.hash) {
			return;
		}
		const hash = $page.url.hash.substring(1);
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
		localStorage.token = token;
		await setSessionUser(sessionUser);
	};

	let onboarding = false;

	onMount(async () => {
		if ($user !== undefined) {
			await goto('/');
		}
		await checkOauthCallback();

		loaded = true;
		if (($config?.features.auth_trusted_header ?? false) || $config?.features.auth === false) {
			await signInHandler();
		} else {
			onboarding = $config?.onboarding ?? false;
		}
	});

	const sendOtpHandler = async () => {
		if (!phoneNumber) {
			formMessage = { type: 'error', text: $i18n.t('Please enter a valid phone number') };
			return;
		}
		
		phoneAuthLoading = true;
		
		try {
			if (!otpSent) {
				// Initialize reCAPTCHA verifier if not already initialized
				if (!recaptchaVerifier) {
					recaptchaVerifier = initRecaptchaVerifier('recaptcha-container');
				}
				
				// Send OTP to phone number
				confirmationResult = await sendOtpToPhone(phoneNumber, recaptchaVerifier);
				
				otpSent = true;
				formMessage = { type: 'success', text: $i18n.t('OTP sent to your phone') };
			} else {
				if (!otpCode) {
					formMessage = { type: 'error', text: $i18n.t('Please enter the OTP code') };
					phoneAuthLoading = false;
					return;
				}
				
				// Verify OTP
				const userData = await verifyOtp(confirmationResult, otpCode);
				
				// Set session user
				await setSessionUser(userData);
				toast.success($i18n.t('Successfully signed in with phone'));
			}
		} catch (error) {
			console.error('Phone auth error:', error);
			
			// Handle specific Firebase error codes
			const errorCode = error.code;
			let errorMessage;
			
			if (errorCode === 'auth/invalid-phone-number') {
				errorMessage = $i18n.t('Invalid phone number format');
			} else if (errorCode === 'auth/code-expired') {
				errorMessage = $i18n.t('OTP code has expired. Please request a new one');
			} else if (errorCode === 'auth/invalid-verification-code') {
				errorMessage = $i18n.t('Invalid OTP code. Please try again');
			} else if (errorCode === 'auth/too-many-requests') {
				errorMessage = $i18n.t('Too many requests. Please try again later');
			} else {
				errorMessage = otpSent 
					? $i18n.t('Failed to verify OTP. Please try again.') 
					: $i18n.t('Failed to send OTP. Please try again.');
			}
			
			formMessage = { type: 'error', text: errorMessage };
			
			// Reset reCAPTCHA if there was an error sending OTP
			if (!otpSent) {
				recaptchaVerifier = null;
			}
		} finally {
			phoneAuthLoading = false;
		}
	};
</script>

<svelte:head>
	<title>{$WEBUI_NAME}</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
	<div class="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
		<div class="text-center relative">
			<!-- Comment out the phone authentication toggle button -->
			<!--
			<div class="absolute top-0 right-0">
				<button
					type="button"
					class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
					on:click={() => {
						showPhoneAuth = !showPhoneAuth;
						// Reset form fields when switching authentication methods
						if (showPhoneAuth) {
							phoneNumber = '';
							otpCode = '';
							otpSent = false;
						} else {
							email = '';
							password = '';
						}
						formMessage = { type: '', text: '' };
					}}
				>
					{showPhoneAuth ? $i18n.t('Continue with email') : $i18n.t('Continue with phone')}
				</button>
			</div>
			-->
			
			<img src="/static/bullbillion.png" alt="BullBillion Logo" class="mx-auto h-12 w-auto mb-4" />
			<h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
				{#if mode === 'signin'}
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

		<!-- Comment out the phone authentication section -->
		<!--
		{#if showPhoneAuth}
			<div class="mt-6 space-y-4">
				<div>
					<label for="phoneNumber" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
						{$i18n.t('Phone Number')}
					</label>
					<div class="mt-1 flex rounded-md shadow-sm">
						<input
							id="phoneNumber"
							bind:value={phoneNumber}
							type="tel"
							required
							class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
							placeholder="+1 (555) 123-4567"
							disabled={otpSent}
						/>
					</div>
					<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
						{$i18n.t('Include country code (e.g., +1 for US)')}
					</p>
				</div>
				
				{#if otpSent}
					<div>
						<label for="otpCode" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							{$i18n.t('OTP Code')}
						</label>
						<div class="mt-1 flex rounded-md shadow-sm">
							<input
								id="otpCode"
								bind:value={otpCode}
								type="text"
								required
								class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
								placeholder="123456"
							/>
						</div>
					</div>
				{/if}
				
				<div id="recaptcha-container"></div>
				
				<button
					type="button"
					class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:hover:bg-blue-700"
					on:click={sendOtpHandler}
					disabled={phoneAuthLoading}
				>
					{#if phoneAuthLoading}
						{$i18n.t('Loading...')}
					{:else}
						{otpSent ? $i18n.t('Verify OTP') : $i18n.t('Send OTP')}
					{/if}
				</button>
				
				{#if otpSent}
					<div class="text-center">
						<button
							type="button"
							class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
							on:click={() => {
								otpSent = false;
								otpCode = '';
								formMessage = { type: '', text: '' };
							}}
							disabled={phoneAuthLoading}
						>
							{$i18n.t('Send new code')}
						</button>
					</div>
				{/if}
				
				<div class="text-center">
					<button
						type="button"
						class="text-sm font-medium text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
						on:click={() => {
							showPhoneAuth = false;
							phoneNumber = '';
							otpCode = '';
							otpSent = false;
							formMessage = { type: '', text: '' };
							recaptchaVerifier = null;
						}}
					>
						{$i18n.t('Back to regular login')}
					</button>
				</div>
			</div>
		{:else}
		-->
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
						{mode === 'signin'
							? $i18n.t('Sign in')
							: ($config?.onboarding ?? false)
								? $i18n.t('Create Admin Account')
								: $i18n.t('Create Account')}
					{/if}
				</button>
			</form>
		<!--{/if}-->

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

			<div class="mt-6 grid grid-cols-1 gap-3 sm:gap-4">
				<!-- Google Sign In - Added label next to icon -->
				<button
					class="flex justify-center items-center bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm p-2.5 sm:p-3"
					on:click={async () => {
						try {
							const user = await signInWithGoogle();
							await setSessionUser(user);
							toast.success($i18n.t('Successfully signed in with Google'));
						} catch (error) {
							console.error("Google sign-in failed:", error);
							toast.error($i18n.t('Google sign-in failed'));
						}
					}}
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

				<!-- Facebook Sign In - Commented out -->
				<!--
				<button
					class="flex justify-center items-center bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm p-2.5 sm:p-3"
					aria-label="Sign in with Facebook"
					on:click={async () => {
						try {
							const user = await signInWithFacebook();
							await setSessionUser(user);
							toast.success($i18n.t('Successfully signed in with Facebook'));
						} catch (error) {
							console.error("Facebook sign-in failed:", error);
							toast.error($i18n.t('Facebook sign-in failed'));
						}
					}}
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="size-8 sm:size-8">
						<circle fill="#039be5" cx="24" cy="24" r="19"/>
						<path fill="#fff" d="M26.572,29.036h4.917l0.772-4.995h-5.69v-2.73c0-2.075,0.678-3.915,2.619-3.915h3.119v-4.359c-0.548-0.074-1.707-0.236-3.897-0.236c-4.573,0-7.254,2.415-7.254,7.917v3.323h-4.701v4.995h4.701v13.729C22.089,42.905,23.032,43,24,43c0.875,0,1.729-0.08,2.572-0.194V29.036z"/>
					</svg>
				</button>
				-->

				<!-- Apple/Microsoft Sign In - Commented out -->
				<!--
				<button
					class="flex justify-center items-center bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm p-2.5 sm:p-3"
					aria-label="Sign in with Microsoft"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" class="size-8 sm:size-8">
						<path d="M 44.527344 34.75 C 43.449219 37.144531 42.929688 38.214844 41.542969 40.328125 C 39.601563 43.28125 36.863281 46.96875 33.480469 46.992188 C 30.46875 47.019531 29.691406 45.027344 25.601563 45.0625 C 21.515625 45.082031 20.664063 47.03125 17.648438 47 C 14.261719 46.96875 11.671875 43.648438 9.730469 40.699219 C 4.300781 32.429688 3.726563 22.734375 7.082031 17.578125 C 9.457031 13.921875 13.210938 11.773438 16.738281 11.773438 C 20.332031 11.773438 22.589844 13.746094 25.558594 13.746094 C 28.441406 13.746094 30.195313 11.769531 34.351563 11.769531 C 37.492188 11.769531 40.8125 13.480469 43.1875 16.433594 C 35.421875 20.691406 36.683594 31.78125 44.527344 34.75 Z M 31.195313 8.46875 C 32.707031 6.527344 33.855469 3.789063 33.4375 1 C 30.972656 1.167969 28.089844 2.742188 26.40625 4.78125 C 24.878906 6.640625 23.613281 9.398438 24.105469 12.066406 C 26.796875 12.152344 29.582031 10.546875 31.195313 8.46875 Z"></path>
					</svg>
				</button>
				-->
			</div>

			<div class="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
				{$i18n.t('By continuing, you agree to our Terms of Service and Privacy Policy')}
			</div>
		{/if}

		<div class="text-center text-sm text-gray-600 dark:text-gray-400">
			{mode === 'signin'
				? $i18n.t("Don't have an account?")
				: $i18n.t('Already have an account?')}
			<button
				type="button"
				class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
				on:click={() => (mode = mode === 'signin' ? 'signup' : 'signin')}
			>
				{mode === 'signin' ? $i18n.t('Sign up') : $i18n.t('Sign in')}
			</button>
		</div>
	</div>
</div>