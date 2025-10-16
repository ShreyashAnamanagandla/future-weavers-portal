import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Award, Calendar, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Certificate {
  id: string;
  intern_id: string;
  project_id: string;
  status: 'draft' | 'issued' | 'approved';
  certificate_data: any;
  issued_at: string | null;
  created_at: string;
}

interface CertificateGeneratorProps {
  internId: string;
  projectId: string;
  internName: string;
  projectTitle: string;
  mentorName?: string;
  completionDate: string;
}

export function CertificateGenerator({
  internId,
  projectId,
  internName,
  projectTitle,
  mentorName,
  completionDate
}: CertificateGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const { toast } = useToast();

  const generateCertificate = async () => {
    setGenerating(true);
    try {
      const certificateData = {
        internName,
        projectTitle,
        mentorName: mentorName || 'LoomeroFlow Team',
        completionDate: new Date(completionDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        issueDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        certificateId: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      };

      const { data, error } = await supabase
        .from('certificates')
        .upsert({
          intern_id: internId,
          project_id: projectId,
          status: 'issued',
          certificate_data: certificateData,
          issued_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setCertificate(data);
      toast({
        title: "Certificate Generated!",
        description: "Certificate has been successfully created and issued.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate certificate. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadCertificate = () => {
    if (!certificate) return;

    const certificateHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate of Completion</title>
        <style>
          body {
            font-family: 'Georgia', serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .certificate {
            background: white;
            padding: 60px;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 800px;
            border: 8px solid #f8f9fa;
          }
          .header {
            border-bottom: 3px solid #667eea;
            padding-bottom: 20px;
            margin-bottom: 40px;
          }
          .title {
            font-size: 48px;
            color: #2c3e50;
            margin: 0;
            font-weight: bold;
          }
          .subtitle {
            font-size: 24px;
            color: #667eea;
            margin: 10px 0;
          }
          .recipient {
            font-size: 36px;
            color: #2c3e50;
            margin: 30px 0;
            font-style: italic;
          }
          .project {
            font-size: 28px;
            color: #34495e;
            margin: 20px 0;
            font-weight: bold;
          }
          .details {
            margin: 40px 0;
            font-size: 18px;
            color: #555;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            border-top: 2px solid #ecf0f1;
            padding-top: 30px;
          }
          .signature {
            text-align: center;
          }
          .signature-line {
            border-bottom: 2px solid #34495e;
            width: 200px;
            margin: 20px auto 10px;
          }
          .cert-id {
            font-size: 12px;
            color: #999;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <h1 class="title">Certificate of Completion</h1>
            <p class="subtitle">LoomeroFlow Internship Program</p>
          </div>
          
          <p style="font-size: 20px; margin: 30px 0;">This is to certify that</p>
          
          <div class="recipient">${certificate.certificate_data.internName}</div>
          
          <p style="font-size: 20px; margin: 30px 0;">has successfully completed the project</p>
          
          <div class="project">"${certificate.certificate_data.projectTitle}"</div>
          
          <div class="details">
            <p>Completed on: ${certificate.certificate_data.completionDate}</p>
            <p>Under the mentorship of: ${certificate.certificate_data.mentorName}</p>
          </div>
          
          <div class="signature-section">
            <div class="signature">
              <div class="signature-line"></div>
              <p>Program Director</p>
              <p>LoomeroFlow</p>
            </div>
            <div class="signature">
              <div class="signature-line"></div>
              <p>Mentor</p>
              <p>${certificate.certificate_data.mentorName}</p>
            </div>
          </div>
          
          <div class="cert-id">
            Certificate ID: ${certificate.certificate_data.certificateId}<br>
            Issued on: ${certificate.certificate_data.issueDate}
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([certificateHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Certificate_${internName.replace(/\s+/g, '_')}_${projectTitle.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Certificate Downloaded",
      description: "Certificate has been saved to your downloads folder.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certificate Generation
        </CardTitle>
        <CardDescription>
          Generate and download completion certificate for {internName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Intern: {internName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-muted-foreground" />
            <span>Project: {projectTitle}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Completion: {new Date(completionDate).toLocaleDateString()}</span>
          </div>
        </div>

        {certificate && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Certificate Generated
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  ID: {certificate.certificate_data.certificateId}
                </p>
              </div>
              <Button onClick={downloadCertificate} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}

        <Button 
          onClick={generateCertificate} 
          disabled={generating || !!certificate}
          className="w-full"
        >
          {generating ? "Generating..." : certificate ? "Certificate Generated" : "Generate Certificate"}
        </Button>
      </CardContent>
    </Card>
  );
}