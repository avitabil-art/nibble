import { StatusBar } from "expo-status-bar";
import { View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import AppNavigator from "./src/navigation/AppNavigator";
import { useRecipeStore } from "./src/state/recipeStore";
import { syncManager } from "./src/utils/syncManager";
import { invitationService } from "./src/api/invitation-service";
import InvitationAcceptModal from "./src/components/InvitationAcceptModal";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { validateEnvironmentOnStartup } from "./src/utils/envValidator";
import { sequentialInitializer, createInitializationTasks } from "./src/utils/sequentialInitializer";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project. 
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

function SafeApp() {
  let recipeStore: any = {};
  try {
    recipeStore = useRecipeStore();
  } catch (error) {
    if (__DEV__) {
      console.error('[App] Failed to initialize recipe store:', error);
    }
    // Create fallback functions to prevent crashes
    recipeStore = {
      initializeUser: async () => {
        if (__DEV__) console.warn('[App] Store not available - using fallback');
      },
      startSync: () => {
        if (__DEV__) console.warn('[App] Store not available - sync disabled');
      },
      acceptInvitation: async () => ({ success: false, error: "Store initialization failed" }),
      setBanner: () => {
        if (__DEV__) console.warn('[App] Store not available - banner disabled');
      }
    };
  }
  
  const { initializeUser, startSync, acceptInvitation, setBanner } = recipeStore;
  const [pendingInvitation, setPendingInvitation] = useState<{
    token: string;
    fromName?: string;
    listName?: string;
    expires?: Date;
  } | null>(null);
  useEffect(() => {
    // Initialize the app using sequential initialization to prevent memory spikes
    const initializeApp = async () => {
      try {
        // Create initialization tasks in order of priority
        const initTasks = [
          // 1. Environment validation (critical, fast)
          createInitializationTasks.envValidation(async () => {
            const envValid = validateEnvironmentOnStartup();
            if (!envValid && !__DEV__) {
              throw new Error("Environment validation failed");
            }
          }),

          // 2. User authentication (non-critical, can fail)
          createInitializationTasks.userInit(async () => {
            if (initializeUser && typeof initializeUser === 'function') {
              await initializeUser();
            }
          }),

           // 3. Sync manager initialization (non-critical, deferred)
           sequentialInitializer.createTask('sync-manager-init', async () => {
             if (syncManager && typeof syncManager.initialize === 'function') {
               setTimeout(() => { try { syncManager.initialize(); } catch {} }, 1000);
             }
           }, { critical: false, timeout: 2000 }),

           // 4. Sync service startup (non-critical, further deferred)
           createInitializationTasks.syncInit(async () => {
             if (startSync && typeof startSync === 'function') {
               setTimeout(() => {
                 try { startSync(); } catch {}
               }, 1500);
             }
           }),
        ];

        // Execute tasks sequentially with memory monitoring
        const result = await sequentialInitializer.initialize(initTasks);
        
        if (result.success) {
          if (__DEV__) {
            console.log('[App] Sequential initialization completed successfully');
          }
        } else {
          if (__DEV__) {
            console.warn('[App] Some initialization tasks failed:', result.failedTasks);
          }
          
          // Check if critical tasks failed
          const criticalTaskFailed = result.failedTasks.includes('environment-validation');
          if (criticalTaskFailed) {
            setBanner("App configuration issue. Please contact support if this persists.");
          } else if (result.failedTasks.length > 0) {
            setBanner("Some features may be limited due to initialization issues.");
          }
        }
        
      } catch (error) {
        if (__DEV__) {
          console.error('[App] Critical initialization failed:', error);
        }
        setBanner("App initialization encountered issues. Some features may be limited.");
      }
    };

    // Use a small delay to let the component render before starting heavy initialization
    const initTimer = setTimeout(initializeApp, 50);
    
    return () => {
      clearTimeout(initTimer);
    };

    // Cleanup on unmount with error handling
    return () => {
      try {
        if (syncManager && typeof syncManager.cleanup === 'function') {
          syncManager.cleanup();
        }
      } catch (cleanupError) {
        if (__DEV__) {
          console.error('[App] Cleanup failed:', cleanupError);
        }
      }
    };
  }, [initializeUser, startSync, setBanner]);

  useEffect(() => {
    // Handle deep link when app opens (deferred)
    const handleInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          setTimeout(() => handleDeepLink(initialUrl), 800);
        }
      } catch (error) {
        if (__DEV__) {
          console.error('Error handling initial URL:', error);
        }
        // Don't crash on deep link errors
      }
    };

    // Handle deep links while app is running
    const handleUrl = (event: { url: string }) => {
      try {
        handleDeepLink(event.url);
      } catch (error) {
        if (__DEV__) {
          console.error('Error handling deep link:', error);
        }
        setBanner("Unable to process invitation link");
      }
    };

    // Set up URL listener with error handling
    let subscription: any = null;
    try {
      subscription = Linking.addEventListener('url', handleUrl);
      handleInitialURL();
    } catch (error) {
      if (__DEV__) {
        console.error('Error setting up deep link handling:', error);
      }
    }

    return () => {
      try {
        subscription?.remove();
      } catch (error) {
        if (__DEV__) {
          console.error('Error removing deep link listener:', error);
        }
      }
    };
  }, [setBanner]);

  const handleDeepLink = (url: string) => {
    if (__DEV__) {
      console.log('[Deep Link] Received URL:', url);
    }
    
    try {
      // Parse invitation URL with error handling
      if (!invitationService || typeof invitationService.parseInvitationUrl !== 'function') {
        if (__DEV__) {
          console.warn('[Deep Link] Invitation service not available');
        }
        return;
      }
      
      const invitationData = invitationService.parseInvitationUrl(url);
      if (invitationData && invitationData.token) {
        // Check if invitation is expired
        if (invitationData.expires && new Date() > invitationData.expires) {
          setBanner("This invitation has expired");
          return;
        }

        // Show invitation acceptance modal with required token
        setPendingInvitation({
          token: invitationData.token,
          fromName: invitationData.fromName,
          listName: invitationData.listName,
          expires: invitationData.expires
        });
      } else if (__DEV__) {
        console.log('[Deep Link] URL is not a valid invitation link');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[Deep Link] Error parsing URL:', error);
      }
      setBanner("Invalid invitation link");
    }
  };

  const handleAcceptInvitation = async () => {
    if (!pendingInvitation) return;

    try {
      const result = await acceptInvitation(pendingInvitation.token);
      if (result.success) {
        setBanner(`Successfully joined "${pendingInvitation.listName || "grocery list"}"!`);
        setPendingInvitation(null);
      } else {
        const msg = result.error || "Failed to accept invitation";
        if (msg.includes("User not authenticated")) {
          setBanner("Set your name to accept invites. Open Join Shared List.");
        } else {
          setBanner(msg);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error accepting invitation:', error);
      }
      setBanner("Something went wrong. Please try again.");
      setPendingInvitation(null); // Clear the modal on error
    }
  };

  const handleDeclineInvitation = () => {
    const tokenToDecline = pendingInvitation?.token;
    setPendingInvitation(null);
    
    // Optionally notify the invitation service about the decline
    if (tokenToDecline && invitationService && typeof invitationService.declineInvitation === 'function') {
      invitationService.declineInvitation(tokenToDecline).catch((error: any) => {
        if (__DEV__) {
          console.error('[Invitation] Decline notification failed:', error);
        }
        // Ignore decline notification errors - user already declined
      });
    }
  };

  return (
    <ErrorBoundary>
      <GestureHandlerRootView className="flex-1">
        <SafeAreaProvider>
          <ErrorBoundary>
            <AppNavigator />
          </ErrorBoundary>
          <StatusBar style="auto" />
          
          {/* Invitation Accept Modal */}
          {pendingInvitation && (
            <ErrorBoundary>
              <InvitationAcceptModal
                visible={true}
                invitation={pendingInvitation}
                onAccept={handleAcceptInvitation}
                onDecline={handleDeclineInvitation}
              />
            </ErrorBoundary>
          )}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// Crash-safe wrapper
export default function App() {
  try {
    return <SafeApp />;
  } catch (error) {
    if (__DEV__) {
      console.error('[App] Critical app crash prevented:', error);
    }
    
    // Fallback UI when everything else fails
    return (
      <ErrorBoundary>
        <GestureHandlerRootView className="flex-1">
          <SafeAreaProvider>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FAFAFA' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2E2E2E', marginBottom: 16, textAlign: 'center' }}>
                App Initialization Error
              </Text>
              <Text style={{ fontSize: 16, color: '#737373', textAlign: 'center', lineHeight: 24 }}>
                The app encountered a critical error during startup. Please restart the app or contact support.
              </Text>
            </View>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    );
  }
}
