import { useCallback } from 'react';
import { useToast } from './use-toast';
// @ts-ignore
import domtoimage from 'dom-to-image';

interface UseComponentActionsOptions {
  componentName?: string;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
}

export function useComponentActions(options: UseComponentActionsOptions = {}) {
  const { toast } = useToast();
  const {
    componentName = 'Component',
    backgroundColor = '#ffffff',
    padding = 20,
    borderRadius = 12
  } = options;

  const downloadComponent = useCallback(async (elementRef: HTMLElement | null, filename?: string) => {
    if (!elementRef) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Component element not found",
      });
      return;
    }

    try {
      const rect = elementRef.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        toast({
          variant: "destructive",
          title: "Download Failed",
          description: "Component is not visible",
        });
        return;
      }

      const dataUrl = await Promise.race([
        domtoimage.toPng(elementRef, {
          quality: 1,
          bgcolor: backgroundColor,
          width: (elementRef.scrollWidth + (padding * 2)) * 2,
          height: (elementRef.scrollHeight + (padding * 2)) * 2,
          style: {
            transform: 'scale(2)',
            transformOrigin: 'top left',
            overflow: 'visible',
            padding: `${padding}px`,
            borderRadius: `${borderRadius}px`,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Download timeout after 10 seconds')), 10000)
        )
      ]) as string;

      const link = document.createElement('a');
      link.download = filename || `${componentName} - ${new Date().toLocaleDateString()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        variant: "success",
        title: "Download Complete",
        description: `${componentName} downloaded successfully`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to generate image",
      });
    }
  }, [componentName, backgroundColor, padding, borderRadius, toast]);

  const copyComponent = useCallback(async (elementRef: HTMLElement | null) => {
    if (!elementRef) {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Component element not found",
      });
      return;
    }

    try {
      const rect = elementRef.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Component is not visible",
        });
        return;
      }

      // Use the same approach as download but convert to blob for clipboard
      const dataUrl = await Promise.race([
        domtoimage.toPng(elementRef, {
          quality: 1,
          bgcolor: backgroundColor,
          width: (elementRef.scrollWidth + (padding * 2)) * 2,
          height: (elementRef.scrollHeight + (padding * 2)) * 2,
          style: {
            transform: 'scale(2)',
            transformOrigin: 'top left',
            overflow: 'visible',
            padding: `${padding}px`,
            borderRadius: `${borderRadius}px`,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Copy timeout after 10 seconds')), 10000)
        )
      ]) as string;

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      if (blob && navigator.clipboard && navigator.clipboard.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          
          toast({
            title: "Copied to Clipboard",
            description: `${componentName} copied as image`,
          });
        } catch (err) {
          console.error('Clipboard write error:', err);
          toast({
            variant: "destructive",
            title: "Copy Failed",
            description: "Clipboard API failed - try using HTTPS or localhost",
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Clipboard API not available",
        });
      }
    } catch (error) {
      console.error('Copy error:', error);
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Failed to generate image for clipboard",
      });
    }
  }, [componentName, backgroundColor, padding, borderRadius, toast]);

  return {
    downloadComponent,
    copyComponent
  };
}