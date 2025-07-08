import { useAuth } from "../providers/AuthProvider";
import { Navigate, useNavigate } from "react-router";
import { CheckSquare, Users, Shield, Zap } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { useState } from "react";

export default function Login() {
  const { user, login, isPending: isAuthPending } = useAuth();
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoggingIn(true);
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokenResponse.access_token}`,
          },
        });

        if (!userInfoRes.ok) {
          throw new Error('Failed to fetch user info from Google');
        }
        
        const userInfo = await userInfoRes.json();
        
        login({
          id: userInfo.sub,
          email: userInfo.email,
        }, tokenResponse.access_token);

        navigate("/");
      } catch (error) {
        console.error("Login failed", error);
      } finally {
        setIsLoggingIn(false);
      }
    },
    flow: 'implicit',
    scope: 'https://www.googleapis.com/auth/tasks',
  });

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">TaskKeep</h1>
            <p className="text-gray-600">
              Sync your Google Tasks & Keep notes
            </p>
          </div>

          {/* Features */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Secure Access</h3>
                <p className="text-sm text-gray-600">
                  Connect securely with your Google account using OAuth
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Privacy First</h3>
                <p className="text-sm text-gray-600">
                  Your data stays private and is never shared with third parties
                </p>
              </div>
            </div>
          </div>

          {/* Login Button */}
          <div className="text-center">
            <button
              onClick={() => handleLogin()}
              disabled={isAuthPending || isLoggingIn}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isAuthPending || isLoggingIn ? 'Connecting...' : 'Continue with Google'}
            </button>
            <p className="text-xs text-gray-500 mt-3">
              By continuing, you agree to our terms of service and privacy policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
