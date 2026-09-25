import { createFileRoute } from '@tanstack/react-router'
// src/routes/visits.tsx
// Display Kiosk Screening History and Vital Measurements with Conversation
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Calendar, Heart, Droplet, Weight, Thermometer, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiService } from '@/lib/api-service';
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import type { UIMessage } from 'ai';

export const Route = createFileRoute('/visits')({
  component: VisitsPage,
});

interface Visit {
  visit_id: string;
  patient_id: string;
  visit_date: string;
  visit_type: string;
  visit_summary: string;
  visit_notes: string | null;
  vitals: {
    blood_pressure: string;
    pulse_rate: number;
    oxygen_saturation: number;
    weight: number;
    height: number;
    bmi: number;
    temperature: number;
    recorded_date: string;
  } | null;
  conversation?: UIMessage[]; // Kiosk conversation history
}

function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    try {
      // API not yet implemented in production
      setVisits([]);
    } catch (error) {
      console.error('Failed to load visits:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock Aaha conversation based on visit summary
  const generateMockConversation = (visit: Visit): UIMessage[] => {
    const messages: UIMessage[] = [
      {
        id: '1',
        role: 'assistant',
        parts: [{
          type: 'text',
          text: `Namaste! I am Aaha, your health companion. I'll help you with a quick health screening today. How are you feeling?`
        }]
      },
      {
        id: '2',
        role: 'user',
        parts: [{
          type: 'text',
          text: visit.visit_summary || 'I came for a general checkup.'
        }]
      }
    ];

    if (visit.vitals) {
      messages.push({
        id: '3',
        role: 'assistant',
        parts: [{
          type: 'text',
          text: `Let me take your vital measurements now. Please relax while I check your blood pressure, pulse, and oxygen levels.`
        }]
      });

      messages.push({
        id: '4',
        role: 'assistant',
        parts: [{
          type: 'text',
          text: `Great! Here are your readings:\n\n**Blood Pressure:** ${visit.vitals.blood_pressure} mmHg\n**Pulse Rate:** ${visit.vitals.pulse_rate} BPM\n**Oxygen Saturation:** ${visit.vitals.oxygen_saturation}%\n**Temperature:** ${visit.vitals.temperature}°C\n**Weight:** ${visit.vitals.weight} kg (BMI: ${visit.vitals.bmi})\n\nYour vitals look good! ${visit.vitals.blood_pressure === '120/80' ? 'Your blood pressure is in the normal range.' : ''}`
        }]
      });
    }

    if (visit.visit_notes) {
      messages.push({
        id: '5',
        role: 'assistant',
        parts: [{
          type: 'text',
          text: `**Screening Summary:**\n\n${visit.visit_notes}\n\nPlease consult with our doctor if you have any concerns. Take care and stay healthy!`
        }]
      });
    }

    return messages;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kiosk Screening History</h1>
        <p className="text-muted-foreground mt-2">
          View your health screenings conducted at our kiosk centers
        </p>
      </div>

      {visits.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Screening History</h3>
            <p className="text-muted-foreground">
              You haven't had any kiosk screenings yet. Visit your nearest AAHA center to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {visits.map((visit) => (
            <Card key={visit.visit_id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {visit.visit_type}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {new Date(visit.visit_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{visit.visit_type}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Aaha Conversation */}
                {visit.conversation && visit.conversation.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Conversation with Aaha
                    </h4>
                    
                    <div className="border rounded-lg p-4 bg-muted/30 max-h-96 overflow-y-auto">
                      <div className="flex flex-col gap-4">
                        {visit.conversation.map((msg) => (
                          <Message key={msg.id} from={msg.role}>
                            <MessageContent>
                              <MessageResponse>
                                {msg.parts.find(p => p.type === 'text')?.text || ''}
                              </MessageResponse>
                            </MessageContent>
                          </Message>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Visit Summary */}
                {visit.visit_summary && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">{visit.visit_summary}</p>
                  </div>
                )}

                {/* Vital Signs */}
                {visit.vitals && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Vital Signs
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Blood Pressure */}
                      <div className="flex items-start gap-3 p-3 border rounded-lg">
                        <Heart className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Blood Pressure</p>
                          <p className="text-lg font-semibold">{visit.vitals.blood_pressure}</p>
                          <p className="text-xs text-muted-foreground">mmHg</p>
                        </div>
                      </div>

                      {/* Oxygen Saturation */}
                      <div className="flex items-start gap-3 p-3 border rounded-lg">
                        <Droplet className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">SpO₂</p>
                          <p className="text-lg font-semibold">{visit.vitals.oxygen_saturation}%</p>
                          <p className="text-xs text-muted-foreground">Oxygen</p>
                        </div>
                      </div>

                      {/* Weight & BMI */}
                      <div className="flex items-start gap-3 p-3 border rounded-lg">
                        <Weight className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Weight / BMI</p>
                          <p className="text-lg font-semibold">{visit.vitals.weight} kg</p>
                          <p className="text-xs text-muted-foreground">BMI: {visit.vitals.bmi}</p>
                        </div>
                      </div>

                      {/* Temperature */}
                      <div className="flex items-start gap-3 p-3 border rounded-lg">
                        <Thermometer className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Temperature</p>
                          <p className="text-lg font-semibold">{visit.vitals.temperature}°C</p>
                          <p className="text-xs text-muted-foreground">Body Temp</p>
                        </div>
                      </div>

                      {/* Pulse Rate */}
                      <div className="flex items-start gap-3 p-3 border rounded-lg">
                        <Heart className="h-5 w-5 text-pink-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Pulse Rate</p>
                          <p className="text-lg font-semibold">{visit.vitals.pulse_rate}</p>
                          <p className="text-xs text-muted-foreground">BPM</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
