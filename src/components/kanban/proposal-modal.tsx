'use client';

import { useRef, useState, useEffect } from 'react';
import type { Lead, ProposalTemplate } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Send, ClipboardCheck, Recycle, ClipboardList, SearchCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type ProposalModalProps = {
  lead: Lead;
  allLeads: Lead[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateLead: (lead: Lead) => void;
  proposalTemplates: ProposalTemplate[];
};

const RioDeJaneiroIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 246 156"
      aria-label="Rio de Janeiro"
      fill="currentColor"
      {...props}
    >
      <path
        d="M206.67,93.41,202,90.4a.8.8,0,0,0-.9.23l-3.3,4-3.7-2.61-3.69-6-.79-3.47.43-3.69,2.83-1.63,2,2.71,3.46.6,5.34-1.68,2.1-3,2.58-4.49,1.2-3.14-1.29-3.23-1.57-2.1-3.24-1.92-2-2.14-1.87-2.48-1.41-3.52-1.2-2.62-1.93-2.22-1.51-2.9-2.31-3.11-2.58L177.3,37l-4,1.4-1.8-1-1.39-2.3,1.38-2.65,1.52-3.68,1.69-5.18,3.2-3.92,1.87-3.25,1.45-3.31,1.15-4.48L183.6,5.1l.3-1.6.43-1.69.8-1.5.54-1.33h.36l1.37.54,2.23,1.69,2.23,2.44,1.62,2.5,1.22,2.58.46,1.45.69,3.15,1.23,2.77,1.85,3.31,1.2,2.16,1.62,2.59,2.5,2.93,1.58,1.4,1.42,1.08,2.77-.3,1.62-1.5,1.54-2,2-2.5,2.08-2.67,1.22-3,1.54-3.54,1.89-2.92,1.36-2.12,1.2-2.82,1.93-2.79,1.16-1.89,1.28-1.4,1.4-1.12,2.16-1.5,2-2,2.39-2.2,2.3-2,2.08-1.66,2.28-1.62,2.93-1.5,1.9-.77,2.2-1,3.1-1.24,2.4-1,2-.8,1.54-.4,1.62.15,1.85.58,2.5,1.5,1.81,1.5,1.42,2.12.8,2.77.19,2.24-.93,2-1.5,2.12-1.73,2.5-1.85,2.39-1.36,3.08-1.28,2.54-1.16,2.5-.9,2.5-.9,2.23-.88,1.7-1,1.41-1.28,1.12-1.5,1.16-1.85,1.42-2.12,1.42-2.28,1.42-2.39,1.12-2.5,1-2.54.77-2.35.61-2.16.42-1.85.3-1.66.19-1.42.08-1.2.08-1.16.23-1.2.36-1.5.6-1.89.92-2.31,1.24-2.67,1.5-3.08,1.81-3.47,1.89-3.83,1.93-4.14,1.89-4.48,1.58-4.83,1.2-5.18.84-5.52.54-5.79.19-6.1-.11-6.39-.42-6.66-.73-6.9-.92-7.17-1.12-7.42-1.28-7.64-1.42-7.85-1.5-8-1.58-8.17-1.62-8.32-1.62-8.47-1.62-8.59-1.58-8.67-1.5-8.75-1.42-8.8-1.33-8.8-.95-5.32-.42-3.15,0-2.5.42-2.5,1-2.85,1.58-3.31,2.08-3.7,2.5-4.06,2.89-4.39,3.24-4.66,3.58-4.9,3.87-5.1,4.14-5.22,4.39-5.34,4.62-5.42,4.83-5.46,5-5.46,5.22-5.38,5.39-5.26,5.55-5.1,5.7-4.9,5.82-4.66,5.9-4.39,5.95-4.06,5.95-3.7,5.9-3.31,5.82-2.93,5.7-2.5,5.55-2,5.39-1.5,5.18-1,4.9,0,16.51-1.94,16.2-3.32,15.61-4.28,15-4.87,14.21-5.18,13.5-5.26,12.79-5.26,12.1-5.1,11.43-4.87,10.74-4.59,10.11-4.28,9.46-3.92,8.8-3.54,8.17-3.11,7.56-2.67,6.94-2.2,6.35-1.77,5.78-1.28,5.22-1.08,4.18-1.54,3.52-1.89,2.83-2.16,2.14-2.39,1.46-2.59.8-2.75.15-2.85-.46-2.93-1-2.97-1.58-2.93-2.12-2.85-2.63-2.71-3.12-2.5-3.58-2.28-4-2-4.44-1.66-4.83-1.28-5.18-.88-5.46-.46-5.67,0-5.82.46-5.9,1-5.87,1.5-5.79,2-5.63,2.5-5.42,3-5.18,3.46-4.9,3.92-4.59,4.35-4.24,4.75-3.83,5.14-3.39,5.51-2.93,5.82-2.44,6.07-1.93,6.28-1.42,6.43-1.08,6.54-.54,6.59,0,6.59.5,6.5,1,.5,1.54,0,2.12.3,2.67.61,3.15.92,3.62,1.24,4,1.54,4.39,1.81,4.75,2.08,5.1,2.3,5.42,2.5,5.7,2.67,6,2.81,6.2,2.93,6.43,3,6.62,3.09,6.82,3.13,7,3.13,7.18,3.13,7.35,3.09,7.52,3.05,7.68,3,7.85,2.89,8,2.77,8.13,2.63,8.25,2.5,8.36,2.35,8.47,2.2,8.55,2.08,8.63,1.93,8.72,1.81,8.76,1.66,8.8,1.5,8.8,1.16,8.76.8,8.67.46,8.55.11,8.4-2.63,1.36-4.48-1.12-3.83-1.28-4.24-1.16-5.1-1.32-5.06-1.54-5.18-1.81-5.26-2.08-5.26-2.35-5.22-2.63-5.14-2.89-5-3.15-4.83-3.43-4.62-3.69-4.39-3.92-4.14-4.14-3.87-4.35-3.58-4.55-3.28-4.75-2.93-4.9-2.59-5.06-2.24-5.18-1.89-5.26-1.54-5.3-1.16-5.3,0-8.8-1-11.43-2.12-14.42-3.32-17.08-4.56-19.46-5.83-21.6-7.1-23.51-8.36-25.21-9.5-26.7-10.51-27.92-11.43-28.91-12.2-29.62-12.87-30.1-13.41-30.3-13.83-30.22-14.17-29.82-14.42-29.14-14.55-28.24-14.55-27.42-14.46-26.65-14.3-25.92-14.06-25.21-13.71-24.53-13.24-23.85-12.65-23.16-11.91-22.48-11.08-21.79-10.21-21.1-9.34-20.42-8.47-19.74-7.6-19.06-6.77-18.39-5.94-17.71-5.14-17.04-4.39-16.37-3.66-15.71-2.97-15.06-2.35-14.42-1.73-13.79-1.16-13.16-.61-12.55,0-11.95.54-11.35,1.08-10.74,1.62-10.15,2.16-9.58,2.71-9,3.24-8.47,3.78-7.93,4.28-7.4,4.79-6.86,5.26-6.35,5.7-5.83,6.07-5.34,6.39-4.83,6.67-4.35,6.86-3.87,6.98-3.39,7.02-2.93,6.98-2.48,6.86-2,6.67-1.58,6.43-1.16,6.16-.73,5.87-.32,5.55-.19,4.71-.43,4.28-.54,3.83-.5,3.39-.46,2.93-.32,2.5,0,1.32.23.84.27.36.32-.11.32-.58.27-1,.15-1.42-.08-1.85-.32-2.28-.61-2.67-.92-3-1.28-3.35-1.62-3.66-2-3.92-2.35-4.18-2.71-4.39-3.09-4.55-3.43-4.66-3.78-4.75-4.1-4.79-4.39-4.75-4.66-4.66-4.9-4.52-5.1-4.31-5.26-4.06-5.38-3.78-5.46-3.47-5.46-3.15-5.42-2.82-5.3-2.48-5.14-2.12-4.9-1.73-4.62-1.32-4.28-1-3.83-.69-3.35-.36-2.85,0-2.35.32-1.85.65-1.36,1-1,1.28-.58,1.58-.19,1.85.19,2.08.58,2.28.92,2.44,1.28,2.55,1.66,2.63,2.08,2.63,2.5,2.59,2.93,2.5,3.35,2.39,3.78,2.24,4.18,2.08,4.59,1.89,5,1.66,5.38,1.42,5.78,1.16,6.12.88,6.47.58,6.8.27,7.1,0,7.35-.3,7.56-.61,7.73-.92,7.85-1.28,7.93-1.62,7.93-2,7.85-2.35,7.73-2.67,7.56-3,7.35-3.28,7.1-3.54,6.82-3.78,6.5-4,6.16-4.24,5.78-4.44,5.38-4.59,4.98-4.71,4.55-4.79,4.14-4.83,3.7-4.83,3.28-4.79,2.85-4.71,2.44-4.59,2-4.44,1.58-4.28,1.16-4.1,1.12-3.15.54-2.67-.19-2.5-.92-2.67-1.66-2.93-2.39-3.28-3.12-3.62-3.83-3.92-4.52-4.2-5.18-4.44-5.83-4.59-6.47-4.71-7.06-4.79-7.64-4.83-8.21-4.83-8.76-4.79-9.29-4.71-9.81-4.59-10.32-4.44-10.8-4.28-11.28-4.1-11.72-3.87-12.14-3.62-12.55-3.35-12.94-3.05-13.31-2.73-13.63-2.39-13.91-2.08-14.17-1.73-14.4-1.36-14.59-.95-14.75-.54-14.87,0-15,.5-15.06,1,15.06,1.5,15,2,14.87,2.5,14.71,3,14.5,3.47,14.28,3.92,14,4.35,13.67,4.79,13.31,5.18,12.9,5.55,12.45,5.87,11.95,6.16,11.43,6.39,10.88,6.59,10.32,6.72,9.75,6.8,9.17,6.8,8.59,6.72,8,6.59,7.44,6.43,6.86,6.2,6.28,5.95,5.7,5.63,5.1,5.26,4.52,4.87,3.92,4.44,3.31,3.96,2.71,3.46,2.12,2.93,1.5,2.35.88,1.77.27,1.2-.32.61-.92,0-1.54-.27-2.12-.27-2.67-.23-3.2-.11-3.7.08-4.18.27-4.66.5-5.1.77-5.51,1-5.87,1.28-6.2,1.58-6.5,1.85-6.76,2.12-6.98,2.39-7.17,2.63-7.31,2.89-7.42,3.12-7.52,3.35-7.56,3.58-7.56,3.83-7.52,4.06-7.44,4.28-7.31,4.52-7.14,4.71-6.94,4.9-6.72,5.06-6.47,5.18-6.2,5.26-5.9,5.3-5.59,5.3-5.26,5.26-4.94,5.18-4.62,5.06-4.28,4.9-3.96,4.71-3.62,4.52-3.28,4.28-2.93,4-2.55,3.66-2.16,3.32-1.77,2.93-1.36,2.5-1,2.08-.61,1.66-.27,1.24,0,.8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,m-2.12-.8L0,111.4l1.81-1.62L3,108.16l1.36-1.93,1.81-1.36,1.45-1.5,1.28-2.28,1.45-2.75,1.9-2.5,1.81-2.93,2.44-3.11,1.93-3,2.81-2.93,2.28-2.5,2.5-2.59,2.81-2.2,2.39-1.93,2.93-1.62,2.85-.77,2.85-1,2.89-1.32,2.89-1.66,2.85-2.08,2.77-2.5,2.67-2.93,2.55-3.39,2.39-3.83,2.2-4.28,2-4.71,1.73-5.1,1.45-5.46,1.16-5.83.84-6.12.54-6.4.23-6.62,0-6.76-.23-6.86-.5-6.9-.77-6.86-1-6.8-1.28-6.66-1.54-6.47-1.81-6.24-2.08-5.95-2.3-5.63-2.5-5.26-2.67-4.87-2.77-4.44-2.85-4-2.89-3.54-2.89-3.08-2.85-2.63-2.77-2.16-2.67-1.69-2.55-1.2-2.39-.73-2.2-1.08-1.58-1.42-1.93-1.73-2.28-2-2.63-2.28-2.97-2.5-3.31-2.71-3.66-2.89-4-3.09-4.31-3.24-4.59-3.39-4.87-3.54-5.1-3.66-5.3-3.78-5.51-3.87-5.67-3.96-5.83-4-5.95-4.06-6.07-4.1-6.16-4.14-6.2-4.14-6.24-4.14-6.28-4.1-6.28-4.06-6.28-4-6.24-3.92-6.2-3.83-6.12-3.74-6.04-3.62-5.95-3.5-5.83-3.35-5.7-3.2-5.55-3.05-5.38-2.85-5.22-2.67-5.06-2.48-4.87-2.28-4.66-2.08-4.44-1.85-4.18-1.62-3.92-1.36-3.66-1.12-3.39-.88-3.09-.65-2.79-.42-2.48-.19-2.16,0-1.85.19-1.5.36-1.16.58-.8.8-.46,1-.11,1.16.23,1.28.54,1.36.84,1.42,1.16,1.42,1.45,1.42,1.73,1.36,2,1.28,2.24,1.16,2.5,1.04,2.71.88,2.93.73,3.15.54,3.35.36,3.54.19,3.7,0,3.83-.19,3.92-.36,4-.54,4-.73,3.92-.88,3.83-1.04,3.7-1.16,3.54-1.28,3.35-1.42,3.15-1.5,2.93-1.62,2.71-1.73,2.48-1.81,2.24-1.9,2-1.93,1.73-1.93,1.45-1.9,1.16-1.85.84-1.77.54-1.66.23-1.54-.08-1.42-.36-1.32-.65-1.2-1-1.08-1.28-1-1.54-.88-1.81-.73-2.08-.54-2.35-.36-2.59-.19-2.82,0-3.05.19-3.28.36-3.47.58-3.66.8-3.83,1.04-3.96,1.28-4.06,1.5-4.14,1.77-4.18,2-4.18,2.24-4.14,2.5-4.06,2.75-3.96,3-3.83,3.2-3.7,3.43-3.54,3.62-3.35,3.83-3.15,4-2.93,4.14-2.71,4.28-2.48,4.39-2.24,4.48-2,4.55-1.73,4.59-1.45,4.59-1.16,4.55-.84,4.48-.54,4.39-.23,4.28,0,4.18.23,4.06.46,3.92.69,3.78.92,3.62,1.16,3.47,1.36,3.31,1.58,3.15,1.81,3,2,2.82,2.2,2.63,2.39,2.44,2.55,2.24,2.71,2.08,2.89,1.89,3.08,1.69,3.24,1.5,3.39,1.28,3.54,1.08,3.66.84,3.78.61,3.87.36,3.96.11,4,0,4.24,1.45,4.62,2.2,5.1,2.55,5.78,2.67,6.47,2.55,7.1,2.39,7.68,2.16,8.21,1.89,8.67,1.62,9.09,1.32,9.46.95,9.79.58,10.07.19,10.32-.19,10.51-.58,10.67-1,10.74-1.42,10.74-1.85,10.67-2.28,10.51-2.67,10.28-3.05,10-3.43,9.66-3.78,9.25-4.1,8.76-4.39,8.25-4.66,7.73-4.87,7.18-5.06,6.62-5.18,6.04-5.26,5.46-5.3,4.87-5.3,4.28-5.26,3.69-5.18,3.12-5.06,2.55-4.9,1.98-4.71,1.42-4.48.88-4.24.32-3.96-.23-3.66-.77-3.35-1.28-3.05-1.81-2.75-2.3-2.44-2.77-2.12-3.2-1.81-3.58-1.5-3.92-1.16-4.24-.8-4.55-.42-4.83,0-5.06.42-5.26.84-5.42,1.24-5.55,1.66-5.63,2.08-5.63,2.5-5.59,2.93-5.51,3.35-5.38,3.78-5.22,4.18-5.02,4.55-4.79,4.9-4.52,5.26-4.2,5.59-3.87,5.9-3.5,6.16-3.12,6.39-2.71,6.59-2.28,6.72-1.85,6.8-1.42,6.8-1,6.72-.54,6.59-.11,6.43.27,6.28.65,6.12.95,5.95,1.28,5.78,1.58,5.59,1.89,5.38,2.16,5.18,2.44,4.94,2.71,4.71,2.93,4.44,3.15,4.18,3.35,3.87,3.5,3.58,3.62,3.28,3.7,2.97,3.78,2.67,3.83,2.35,3.83,2.05,3.83,1.73,3.78,1.42,3.7,1.12,3.58.8,3.46.5,3.31.19,3.15-.11,3-.42,2.82-.73,2.63-1.04,2.44-1.32,2.24-1.58,2.05-1.85,1.85-2.08,1.62-2.3,1.36-2.5,1.08-2.67.77-2.82.46-2.97.15-3.08-.19-3.15-.5-3.2-.8-3.2-1.12-3.15-1.42-3.05-1.73-2.93-2-2.77-2.28-2.63-2.5-2.48-2.71-2.3-2.93-2.12-3.12-1.93-3.28-1.73-3.43-1.5-3.58-1.28-3.7-1.04-3.78-.8-3.87-.54-3.92-.27-3.96,0-4,1.81-4.28,3.43-4.52,5-4.66,6.5-4.79,8-4.83,9.5-4.79,11-4.71,12.5-4.55,14-4.35,15.5-4.1,17-3.83,18.5-3.5,20-3.12,21.5-2.71,23-2.28,24.5-1.81,26-1.32,27.5-1.08,28.24-.77,28.95-.42,29.67.08,30.34.58,31,1.08,31.64,1.58,32.28,2.08,32.9,2.59,33.51,3.09,34.1,3.58,34.66,4.06,35.21,4.52,35.75,5,36.27,5.42,36.78,5.82,37.28,6.2,37.77,6.55,38.24,6.86,38.7,7.14,39.14,7.4,39.57,7.64,40,7.85,40.41,8.05,40.82,8.21,41.22,8.36,41.6,8.47,42,8.55,42.36,8.59,42.74,8.59,43.1,8.55,43.45,8.47,43.8,8.36,44.14,8.21,44.48,8.05,44.8,7.85,45.12,7.64,45.42,7.4,45.7,7.14,45.96,6.86,46.2,6.55,46.43,6.2,46.62,5.82,46.8,5.42,46.9,5,47,4.55,47.06,4.1,47.06,3.66,47.02,3.2,46.9,2.75,46.72,2.31,46.5,1.89,46.24,1.46,45.92,1.04,45.55.61,45.16.19,44.75-.23,43.88-1.08,43.45-1.5,43-2,42.54-2.44,42.06-2.89,41.57-3.32,41.08-3.74,40.57-4.14,40.07-4.52,39.57-4.87,39.06-5.18,38.54-5.46,38.03-5.7,37.5-5.9,37-6.07,36.47-6.2,35.92-6.28,35.38-6.32,34.83-6.32,34.27-6.28,33.72-6.2,33.16-6.07,32.61-5.9,32.07-5.7,31.54-5.46,31-5.18,30.48-4.87,29.93-4.52,29.39-4.14,28.87-3.74,28.35-3.32,27.84-2.85,27.33-2.35,26.83-1.85,26.33-1.32,25.84-1.2,24.57-1.54,23.89-1.85,23.2-2.12,22.52-2.39,21.83-2.63,21.14-2.85,20.46-3.05,19.78-3.24,19.1-3.39,18.41-3.5,17.73-3.58,17.04-3.62,16.37-3.62,15.69-3.58,15.02-3.5,14.34-3.39,13.67-3.24,13-3.05,12.34-2.85,11.69-2.63,11.04-2.39,10.39-2.12,9.75-1.81,9.13-1.5,8.51-1.16,7.9-1,6.5-1.28,5.7-1.54,4.9-1.81,4.06-2.08,3.24-2.3,2.44-2.5,1.62-2.67.8-2.77,0-2.85l-4.48,1.12-3.78,2.71-3,5.1.77,3.58-1.58,3.31-2.81,2.08-3.87.54-4.28-1.36-4.1-1.45-3.87-1.28-2.93-1.28-2.59-1.62-2.24-2-2.2-2.39-1.81-2.77-1.66-3.15-1.5-3.54-1.28-3.92-.95-4.28-.61-4.62-.27-4.9,0-5.18.27-5.42.58-5.63.92-5.78,1.24-5.9,1.58-5.95,1.93-5.95,2.28-5.9,2.63-5.78,3-5.63,3.35-5.42,3.66-5.18,4-4.9,4.28-4.59,4.55-4.24,4.79-3.87,5-3.47,5.18-3.05,5.3-2.63,5.38-2.16,5.38-1.69,5.34-1.2,5.22-.73,5.06-.23,4.87.23,4.62.69,4.35,1.16,4.06,1.62,3.74,2.08,3.39,2.5,3.05,2.93,2.67,3.35,2.28,3.74,1.89,4.06,1.5,4.35,1.08,4.59.65,4.79.23,4.94Z"
      />
    </svg>
  );

export default function ProposalModal({
  lead,
  allLeads,
  isOpen,
  onOpenChange,
  onUpdateLead,
  proposalTemplates,
}: ProposalModalProps) {
  const proposalRef = useRef<HTMLDivElement>(null);
  const [proposalBody, setProposalBody] = useState(lead.proposalSummary);
  const [fullProposalNumber, setFullProposalNumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      setProposalBody(lead.proposalSummary);

      let currentProposalNumber = lead.proposalNumber;

      if (!currentProposalNumber) {
        // This is a simplified way to get the next number. In a real multi-user app, this should be handled by a backend.
        const highestProposalNumber = Math.max(0, ...allLeads.map(l => l.proposalNumber || 0));
        currentProposalNumber = highestProposalNumber + 1;
      }
      
      const paddedNumber = String(currentProposalNumber).padStart(3, '0');
      const version = lead.proposalVersion || 0;
      const proposalId = `PTC-FLO-SST-${paddedNumber}.${version}`;
      setFullProposalNumber(proposalId);
      
      // Update lead state if a new number was generated
      if(!lead.proposalNumber) {
        onUpdateLead({
          ...lead,
          proposalNumber: currentProposalNumber,
        });
      }
    }
  }, [isOpen, lead, allLeads, onUpdateLead]);


  const handleTemplateChange = (templateId: string) => {
    const template = proposalTemplates.find(t => t.id === templateId);
    if (template) {
      setProposalBody(template.content);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleDownloadPdf = () => {
    const input = proposalRef.current;
    if (input) {
      // Temporarily set the content of the editable div for PDF generation
      const editableDiv = input.querySelector('[contenteditable]');
      if (editableDiv) {
        editableDiv.innerHTML = proposalBody.replace(/\n/g, '<br />');
      }

      onUpdateLead({
        ...lead,
        proposalGeneratedCount: (lead.proposalGeneratedCount || 0) + 1,
      });
      html2canvas(input, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(
          `proposta-${lead.company.toLowerCase().replace(/ /g, '-')}.pdf`
        );
      });
    }
  };

  const handleSendWhatsApp = () => {
    onUpdateLead({
      ...lead,
      whatsappSentCount: (lead.whatsappSentCount || 0) + 1,
    });
    const message = `Olá ${lead.name}, segue a proposta para a empresa ${lead.company}. Estamos à disposição para qualquer esclarecimento.`;
    const whatsappUrl = `https://wa.me/${
      lead.whatsapp
    }?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    // Idealmente, aqui você também anexaria o PDF, o que é complexo via link direto.
    // Uma alternativa é primeiro salvar o PDF e depois enviá-lo manualmente.
  };

  const serviceAreas = [
    { icon: ClipboardCheck, label: 'Saúde e Segurança do Trabalho' },
    { icon: Recycle, label: 'Meio Ambiente' },
    { icon: ClipboardList, label: 'eSocial SST' },
    { icon: SearchCheck, label: 'Auditorias e Inspeções' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Gerador de Proposta</DialogTitle>
          <DialogDescription>
            Visualize, edite e envie a proposta para {lead.company}.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <Label htmlFor="proposal-template">Selecione um Modelo de Serviço</Label>
          <Select onValueChange={handleTemplateChange}>
            <SelectTrigger id="proposal-template">
              <SelectValue placeholder="Escolha um modelo para o objeto da proposta" />
            </SelectTrigger>
            <SelectContent>
              {proposalTemplates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-md">
          <div
            ref={proposalRef}
            className="p-8 bg-white dark:bg-black text-black dark:text-white"
            id="proposal-content"
          >
            {/* Cabeçalho da Proposta */}
            <header className="flex justify-between items-center pb-4 border-b">
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  Grupo Florencio
                </h1>
                <p className="text-sm">Soluções em Segurança do Trabalho</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-semibold">Proposta Comercial</h2>
                 <p className="text-sm">
                  {fullProposalNumber}
                </p>
                <p className="text-sm">
                  Data: {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </header>

            {/* Informações do Cliente */}
            <section className="my-8">
              <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                Para:
              </h3>
              <p className="font-bold">{lead.company}</p>
              <p>
                A/C: {lead.name}
                {lead.role && `, ${lead.role}`}
              </p>
              <p>CNPJ: {lead.cnpj}</p>
              <p>Email: {lead.email}</p>
              <p>WhatsApp: {lead.whatsapp}</p>
            </section>

             {/* Sobre Nós */}
            <section className="my-8 space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Sobre nós</h3>
                <p className="text-sm leading-relaxed">
                Somos apaixonados há mais de uma década por transformar ambientes de trabalho. O Grupo Florêncio se consolidou como referência em Saúde e Segurança do Trabalho. Nossa equipe, especializada e eficiente, atua com cuidado e comprometimento para criar espaços corporativos mais seguros, sustentáveis e alinhados às Normas Regulamentadoras. Com transparência e expertise, proporcionamos a confiança que sua empresa precisa para elevar seus padrões de segurança e eficiência. Confie em nossa experiência para alcançar resultados valiosos e duradouros.
                </p>
                <blockquote className="border-l-4 border-primary pl-4 py-2 my-4">
                    <p className="text-sm italic">"Nossos serviços são investimentos, onde trazemos benefícios que superam qualquer custo, pois não é sobre preço, é sobre entregar resultados valiosos. Comprometemo-nos integralmente a proporcionar excelência em Saúde e Segurança do Trabalho, impulsionados pela nossa especialização e dedicação incansável.”</p>
                    <footer className="text-right text-xs font-medium mt-2">Grupo Florêncio</footer>
                </blockquote>

                <h4 className="text-md font-semibold text-center text-gray-800 dark:text-gray-200">Temos uma equipe especializada para oferecer as melhores soluções em:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center my-6">
                    {serviceAreas.map((area, index) => (
                        <div key={index} className="flex flex-col items-center">
                            <div className="bg-primary/10 text-primary rounded-full p-4 mb-2">
                                <area.icon className="h-8 w-8" />
                            </div>
                            <span className="text-xs font-semibold">{area.label}</span>
                        </div>
                    ))}
                </div>
                <div className='border-b'></div>

                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Objetivo</h3>
                <p className="text-sm leading-relaxed">
                Temos por objetivo o compromisso em oferecer serviços de Saúde Ocupacional e Segurança do Trabalho com excelência e em conformidade com a legislação, promovendo ambientes corporativos seguros, saudáveis e produtivos.
                </p>
                <div className='border-b'></div>
                <p className="text-sm leading-relaxed">
                Esta Proposta Comercial está com valores compatíveis de Negociação para o atendimento da Prestação de Serviços de QSMS - Qualidade, Segurança, Meio Ambiente e Saúde. Gostaríamos de salientar o grande interesse que temos em trabalhar em parceria com a sua empresa, pois a nossa missão é oferecer serviços em gestão através de uma visão estratégica buscando a satisfação do cliente e melhorias para a  sociedade.
                </p>
                 <p className="text-sm leading-relaxed">
                Para tal, encaminhamos ao V. Sr. (a)., a presente Proposta de Preços para a realização dos serviços conforme descritos, de acordo com as diretrizes técnicas, para esta conceituada empresa.
                </p>
            </section>

             {/* Localização Estratégica */}
            <section className="my-8">
                <div className="bg-muted/50 dark:bg-muted/20 p-6 rounded-lg">
                    <div className="bg-primary/20 text-primary-foreground text-center p-2 rounded-t-lg">
                        <h3 className="font-bold text-primary">Nossa Localização Estratégica</h3>
                    </div>
                    <div className="p-6 bg-card rounded-b-lg">
                        <p className="text-sm leading-relaxed mb-4">
                            Nossas unidades de atendimento em medicina do trabalho estão estrategicamente distribuídas para estar próximas tanto dos seus funcionários quanto da sua empresa, facilitando o fluxo de atendimento e otimizando a logística dos serviços. 
                        </p>
                        <p className="text-sm leading-relaxed mb-4">
                            <span className="font-bold">Localizadas no:</span> Centro do RJ, Nova Iguaçu, Duque de Caxias, Vila Kosmos – Vila da Penha, Barra da Tijuca, Niterói, Macaé.
                        </p>
                        <p className="text-sm leading-relaxed mb-6">
                            Cada unidade foi planejada para proporcionar agilidade e eficiência na realização de exames, consultas e demais procedimentos essenciais.
                        </p>
                        <div className="flex justify-center">
                            <RioDeJaneiroIcon className="w-48 h-auto text-primary" />
                        </div>
                    </div>
                </div>
            </section>


            {/* Corpo da Proposta */}
            <section className="my-8">
              <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                Objeto da Proposta
              </h3>
              <div
                contentEditable
                suppressContentEditableWarning
                className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                dangerouslySetInnerHTML={{
                  __html: proposalBody.replace(/\n/g, '<br />'),
                }}
                onBlur={e => setProposalBody(e.currentTarget.innerText)}
              />
            </section>

            {/* Investimento */}
            <section className="my-8">
              <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                Investimento
              </h3>
              <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-lg">Valor Total:</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(lead.value)}
                </p>
              </div>
            </section>

            {/* Condições de Pagamento */}
            <section className="my-8">
              <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                Condições de Pagamento
              </h3>
              <ul className="list-disc list-inside space-y-2">
                {lead.paymentMethods.map((pm, index) => (
                  <li key={index}>
                    {pm.method}
                    {pm.method.includes('Crédito') && pm.cardFee && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {' '}
                        (taxa de {pm.cardFee}% inclusa)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* Rodapé */}
            <footer className="text-center pt-8 border-t mt-8">
              <p className="font-bold">Grupo Florencio</p>
              <p className="text-xs">
                comercial@grupoflorencio.com.br | +55 (21) 96453-9493
              </p>
              <p className="text-xs">www.grupoflorencio.com.br</p>
            </footer>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 flex-wrap">
          <p className="text-xs text-muted-foreground text-left flex-1 mr-auto">
            O objeto da proposta é editável. Clique no texto para alterar.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
            <Button onClick={handleSendWhatsApp}>
              <Send className="mr-2 h-4 w-4" />
              Enviar via WhatsApp
            </Button>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
