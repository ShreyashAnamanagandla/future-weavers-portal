
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const InternDashboard = () => {
  return (
    <div className="min-h-screen bg-loomero-background p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-loomero-text font-anta mb-8">Intern Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border-loomero-accent/20">
            <CardHeader>
              <CardTitle className="text-loomero-text font-anta">Coming Soon</CardTitle>
              <CardDescription>Intern Portal Features</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-loomero-text/70">Task tracking, badge collection, and certificate preview will be available here.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InternDashboard;
