import React from 'react'
import { X, LayoutTemplate, Sparkles, Globe, ShieldCheck, ArrowRight } from 'lucide-react'
import { useWorkflowStore } from '../store/useWorkflowStore'

interface TemplatesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TemplatesModal({ isOpen, onClose }: TemplatesModalProps) {
  const importWorkflowJson = useWorkflowStore((s) => s.importWorkflowJson)

  if (!isOpen) return null

  const templates = [
    {
      id: 'webhook-ai-summarizer',
      title: 'Inbound Webhook to AI Summarizer & Dispatch',
      description: 'Receives webhook payloads, passes message text to AI prompt model, and dispatches summarized result to remote endpoint.',
      category: 'AI Automation',
      icon: <Sparkles size={20} className="text-indigo-500" />,
      nodes: [
        { id: 'webhook_1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'Webhook Trigger', config: {} } },
        { id: 'ai_1', type: 'ai-prompt', position: { x: 380, y: 200 }, data: { label: 'AI Summarizer', config: { model: 'gpt-4o', system_prompt: 'Summarize the input text concisely.', user_prompt: '{{ $json.body.message }}', temperature: 0.5 } } },
        { id: 'http_1', type: 'http-request', position: { x: 680, y: 200 }, data: { label: 'POST Summary', config: { method: 'POST', url: 'https://httpbin.org/post', body: { summary: '{{ $node.ai_1.response }}' } } } }
      ],
      edges: [
        { id: 'edge-webhook_1-ai_1', source: 'webhook_1', target: 'ai_1', style: { stroke: '#94a3b8', strokeWidth: 2 } },
        { id: 'edge-ai_1-http_1', source: 'ai_1', target: 'http_1', style: { stroke: '#94a3b8', strokeWidth: 2 } }
      ]
    },
    {
      id: 'api-health-monitor',
      title: 'API Health Monitor & Condition Evaluator',
      description: 'Periodic health ping to an external microservice. Evaluates status code via IF condition branch.',
      category: 'DevOps & Monitoring',
      icon: <Globe size={20} className="text-green-500" />,
      nodes: [
        { id: 'delay_1', type: 'delay', position: { x: 100, y: 200 }, data: { label: '5s Monitor Interval', config: { duration: 5 } } },
        { id: 'http_1', type: 'http-request', position: { x: 380, y: 200 }, data: { label: 'Check Service Health', config: { method: 'GET', url: 'https://httpbin.org/get' } } },
        { id: 'if_1', type: 'if', position: { x: 680, y: 180 }, data: { label: 'Verify 200 OK', config: { value1: '{{ $node.http_1.status }}', condition: 'equals', value2: '200' } } },
        { id: 'set_1', type: 'set', position: { x: 970, y: 140 }, data: { label: 'Set Healthy Status', config: { variable: 'service_status', value: 'HEALTHY' } } },
        { id: 'set_2', type: 'set', position: { x: 970, y: 280 }, data: { label: 'Set Alert Status', config: { variable: 'service_status', value: 'UNHEALTHY' } } }
      ],
      edges: [
        { id: 'edge-delay_1-http_1', source: 'delay_1', target: 'http_1', style: { stroke: '#94a3b8', strokeWidth: 2 } },
        { id: 'edge-http_1-if_1', source: 'http_1', target: 'if_1', style: { stroke: '#94a3b8', strokeWidth: 2 } },
        { id: 'edge-if_1-set_1', source: 'if_1', target: 'set_1', sourceHandle: 'true', style: { stroke: '#16a34a', strokeWidth: 2 } },
        { id: 'edge-if_1-set_2', source: 'if_1', target: 'set_2', sourceHandle: 'false', style: { stroke: '#dc2626', strokeWidth: 2 } }
      ]
    },
    {
      id: 'lead-enrichment-pipeline',
      title: 'Lead Intake & Score Enrichment Pipeline',
      description: 'Ingests inbound leads, sets default scoring variables, and posts to customer enrichment service.',
      category: 'Sales & CRM Integration',
      icon: <ShieldCheck size={20} className="text-purple-500" />,
      nodes: [
        { id: 'webhook_1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'Lead Ingestion Webhook', config: {} } },
        { id: 'set_1', type: 'set', position: { x: 380, y: 200 }, data: { label: 'Initialize Lead Score', config: { variable: 'lead_score', value: '100' } } },
        { id: 'http_1', type: 'http-request', position: { x: 660, y: 200 }, data: { label: 'Sync to CRM Endpoint', config: { method: 'POST', url: 'https://httpbin.org/post', body: { lead: '{{ $json.email }}', score: '{{ $json.lead_score }}' } } } }
      ],
      edges: [
        { id: 'edge-webhook_1-set_1', source: 'webhook_1', target: 'set_1', style: { stroke: '#94a3b8', strokeWidth: 2 } },
        { id: 'edge-set_1-http_1', source: 'set_1', target: 'http_1', style: { stroke: '#94a3b8', strokeWidth: 2 } }
      ]
    }
  ]

  const handleSelectTemplate = (template: typeof templates[0]) => {
    const jsonStr = JSON.stringify({ nodes: template.nodes, edges: template.edges })
    importWorkflowJson(jsonStr)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
              <LayoutTemplate size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-[16px]">Workflow Templates Hub</h2>
              <p className="text-[12px] text-slate-400">Choose a pre-built template to instantly populate your visual canvas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Template Gallery */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          {templates.map((tpl) => (
            <div 
              key={tpl.id}
              className="group p-5 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/80 rounded-xl transition duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shrink-0 h-fit">
                  {tpl.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60">
                      {tpl.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[14px] mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {tpl.title}
                  </h3>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-xl">
                    {tpl.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleSelectTemplate(tpl)}
                className="shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-[13px] shadow-sm transition active:scale-95"
              >
                <span>Use Template</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
