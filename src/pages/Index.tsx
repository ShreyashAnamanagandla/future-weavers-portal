
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Award, FileText, Target } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-loomero-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-loomero-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-loomero-hero font-anta">LoomeroFlow</h1>
              <span className="text-sm text-loomero-text bg-loomero-accent/10 px-2 py-1 rounded-full">
                Future Weavers Portal
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="border-loomero-hero text-loomero-hero hover:bg-loomero-hero hover:text-white">
                Sign In
              </Button>
              <Button className="bg-loomero-hero hover:bg-loomero-hero/90 text-white">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-loomero-text mb-6 font-anta">
            Welcome to{" "}
            <span className="text-loomero-hero">LoomeroFlow</span>
          </h2>
          <p className="text-xl text-loomero-text/80 max-w-3xl mx-auto mb-8">
            A centralized portal for managing internships and employee mentorships at LOOMERO. 
            Automate onboarding, track milestones, earn badges, and generate beautiful certificates.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-loomero-hero hover:bg-loomero-hero/90 text-white px-8">
              Start Your Journey
            </Button>
            <Button size="lg" variant="outline" className="border-loomero-hero text-loomero-hero hover:bg-loomero-hero hover:text-white px-8">
              Learn More
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="bg-white border-loomero-accent/20 hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-8 w-8 text-loomero-hero mb-2" />
              <CardTitle className="text-loomero-text font-anta">Role-Based Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-loomero-text/70">
                Dedicated portals for Admins, Mentors, and Interns with tailored experiences
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20 hover:shadow-lg transition-shadow">
            <CardHeader>
              <Target className="h-8 w-8 text-loomero-hero mb-2" />
              <CardTitle className="text-loomero-text font-anta">Milestone Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-loomero-text/70">
                Structured journey tracking with visual progress indicators and achievements
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20 hover:shadow-lg transition-shadow">
            <CardHeader>
              <Award className="h-8 w-8 text-loomero-hero mb-2" />
              <CardTitle className="text-loomero-text font-anta">Badge System</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-loomero-text/70">
                Interactive badges with achievements, tooltips, and mentor recognition system
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20 hover:shadow-lg transition-shadow">
            <CardHeader>
              <FileText className="h-8 w-8 text-loomero-hero mb-2" />
              <CardTitle className="text-loomero-text font-anta">Smart Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-loomero-text/70">
                Beautiful branded certificates with LinkedIn integration and PDF export
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-loomero-hero to-loomero-accent text-white rounded-2xl p-8 md:p-12 text-center">
          <h3 className="text-3xl font-bold mb-4 font-anta">Ready to Transform Your Internship Program?</h3>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join LOOMERO's Future Weavers community and create meaningful, narrative-driven achievements 
            that can be celebrated, shared, and remembered.
          </p>
          <Button size="lg" variant="secondary" className="bg-white text-loomero-hero hover:bg-white/90 px-8">
            Get Started Today
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-loomero-accent/20 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-loomero-text/60">
            <p>&copy; 2024 LOOMERO. Building the future, one weaver at a time.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
