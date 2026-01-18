"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, XCircle, Clock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const [errorCode, setErrorCode] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        // Check URL search params first
        let err = searchParams.get('error')
        let code = searchParams.get('error_code')
        let msg = searchParams.get('message')

        // If no error, check hash fragment (Supabase puts errors there)
        if (!err && typeof window !== 'undefined') {
            const hash = window.location.hash.substring(1)
            const hashParams = new URLSearchParams(hash)
            err = hashParams.get('error')
            code = hashParams.get('error_code')
            msg = hashParams.get('error_description')
        }

        setError(err)
        setErrorCode(code)
        setMessage(msg)
    }, [searchParams])

    // Handle OTP expired error
    if (errorCode === 'otp_expired' || error === 'access_denied') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <Clock className="h-12 w-12 text-orange-500" />
                        </div>
                        <CardTitle className="text-2xl">Link Expired</CardTitle>
                        <CardDescription className="text-base mt-2">
                            This verification link has expired or has already been used.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                What to do:
                            </h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>• Email verification links expire after 24 hours</li>
                                <li>• Links can only be used once</li>
                                <li>• Request a new verification email to continue</li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <Button onClick={() => router.push('/auth/signup')} className="w-full">
                                <Mail className="h-4 w-4 mr-2" />
                                Request New Verification Email
                            </Button>
                            <Button onClick={() => router.push('/auth/signin')} className="w-full" variant="outline">
                                Sign In
                            </Button>
                            <Button onClick={() => router.push('/')} className="w-full" variant="ghost">
                                Go to Home
                            </Button>
                        </div>

                        {errorCode && (
                            <p className="text-xs text-center text-gray-500">Error code: {errorCode}</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Generic error
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <XCircle className="h-12 w-12 text-red-500" />
                    </div>
                    <CardTitle className="text-2xl">Authentication Error</CardTitle>
                    <CardDescription className="text-base mt-2">
                        {message || "An error occurred during authentication"}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            What to do:
                        </h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• The link may be invalid or expired</li>
                            <li>• Try signing in again</li>
                            <li>• Contact support if the problem persists</li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <Button onClick={() => router.push('/auth/signin')} className="w-full">
                            Sign In
                        </Button>
                        <Button onClick={() => router.push('/')} className="w-full" variant="outline">
                            Go to Home
                        </Button>
                    </div>

                    {errorCode && (
                        <p className="text-xs text-center text-gray-500">Error code: {errorCode}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
