"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, XCircle, Clock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const error = searchParams.get('error')
    const errorCode = searchParams.get('error_code')
    const message = searchParams.get('message')

    const getErrorDetails = () => {
        // Handle OTP expired error
        if (errorCode === 'otp_expired' || error === 'access_denied') {
            return {
                icon: <Clock className="h-12 w-12 text-orange-500" />,
                title: "Link Expired",
                description: "This verification link has expired or has already been used.",
                suggestions: [
                    "Email verification links expire after 24 hours",
                    "Links can only be used once",
                    "Request a new verification email to continue"
                ]
            }
        }

        // Handle generic authentication errors
        return {
            icon: <XCircle className="h-12 w-12 text-red-500" />,
            title: "Authentication Error",
            description: message || "An error occurred during authentication",
            suggestions: [
                "The link may be invalid or expired",
                "Try signing in again",
                "Contact support if the problem persists"
            ]
        }
    }

    const errorDetails = getErrorDetails()

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        {errorDetails.icon}
                    </div>
                    <CardTitle className="text-2xl">{errorDetails.title}</CardTitle>
                    <CardDescription className="text-base mt-2">
                        {errorDetails.description}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            What to do:
                        </h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            {errorDetails.suggestions.map((suggestion, index) => (
                                <li key={index}>• {suggestion}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <Button
                            onClick={() => router.push('/auth/signup')}
                            className="w-full"
                            variant="default"
                        >
                            <Mail className="h-4 w-4 mr-2" />
                            Request New Verification Email
                        </Button>

                        <Button
                            onClick={() => router.push('/auth/signin')}
                            className="w-full"
                            variant="outline"
                        >
                            Sign In
                        </Button>

                        <Button
                            onClick={() => router.push('/')}
                            className="w-full"
                            variant="ghost"
                        >
                            Go to Home
                        </Button>
                    </div>

                    {errorCode && (
                        <p className="text-xs text-center text-gray-500">
                            Error code: {errorCode}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
