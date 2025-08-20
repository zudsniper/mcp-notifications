import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            MCP Notifications
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Real-time notification server with SSE, webhook support, and web management interface
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Get Started
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">
                Sign In
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🚀 Real-time SSE
              </CardTitle>
              <CardDescription>
                Server-sent events for instant notification delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Connect via SSE for real-time notifications with automatic reconnection and connection management.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🔗 Multiple Webhooks
              </CardTitle>
              <CardDescription>
                Support for Discord, Slack, Teams, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure multiple webhook endpoints with fallback support and custom formatting.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚡ Cloudflare Powered
              </CardTitle>
              <CardDescription>
                Built on Cloudflare Workers for global scale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Deployed on Cloudflare&apos;s edge network for low latency and high availability.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎯 MCP Compatible
              </CardTitle>
              <CardDescription>
                Seamless integration with Model Context Protocol
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Drop-in replacement for existing MCP notification servers with enhanced features.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Web Dashboard
              </CardTitle>
              <CardDescription>
                Manage configurations through a modern web interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure webhooks, view notification history, and monitor connections in real-time.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🔄 Fallback Support
              </CardTitle>
              <CardDescription>
                Automatic fallback webhooks for reliability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure backup webhook URLs to ensure notifications are always delivered.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-muted rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">
            Create an account and configure your first webhook in minutes.
          </p>
          <Button asChild size="lg">
            <Link href="/auth/register">
              Create Account
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
