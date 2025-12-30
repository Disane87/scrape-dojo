import { BaseAction } from "./bases/base.action";
import { Action } from "../_decorators/action.decorator";

export type DisplayType = 'auto' | 'json' | 'table' | 'text' | 'file' | 'image' | 'link' | 'card';

export type DisplayActionParams = {
    data: any;
    type?: DisplayType;
    title?: string;
    description?: string;
    template?: string; // Handlebars template for 'card' type
    flush?: boolean; // Compact list-style rendering for cards
}

export interface DisplayArtifact {
    type: DisplayType;
    title?: string;
    description?: string;
    data: any;
    template?: string; // Handlebars template for 'card' type
    flush?: boolean; // Compact list-style rendering for cards
    metadata?: {
        itemCount?: number;
        dataType?: string;
        timestamp?: number;
    };
}

@Action('artifacts', {
    displayName: 'Artifacts',
    icon: 'Eye',
    description: 'Display data as an artifact in the UI (auto-detects format)',
    color: 'purple',
    category: 'utility'
})
export class DisplayAction extends BaseAction<DisplayActionParams> {
    async run(): Promise<DisplayArtifact> {
        const { data, type = 'auto', title, description, template, flush } = this.params;

        // Auto-detect type if set to 'auto'
        const detectedType = type === 'auto' ? this.detectType(data) : type;

        // If card type with template, render the template with data
        let renderedTemplate = template;
        if (detectedType === 'card' && template && data) {
            this.logger.log(`🎴 Rendering card template with data (type: ${typeof data}): ${JSON.stringify(data)}`);
            const Handlebars = require('handlebars');
            const templateFn = Handlebars.compile(template);
            renderedTemplate = templateFn(data);
            this.logger.debug(`🎴 Rendered template: ${renderedTemplate}`);
        }

        const artifact: DisplayArtifact = {
            type: detectedType,
            title,
            description,
            data,
            template: renderedTemplate,
            flush,
            metadata: {
                dataType: typeof data,
                timestamp: Date.now()
            }
        };

        // Add metadata based on type
        if (Array.isArray(data)) {
            artifact.metadata!.itemCount = data.length;
        } else if (typeof data === 'object' && data !== null) {
            artifact.metadata!.itemCount = Object.keys(data).length;
        }

        this.logger.log(`📊 Display artifact created: ${detectedType}${title ? ` - ${title}` : ''}`);
        
        return artifact;
    }

    /**
     * Auto-detect the best display type for the data
     */
    private detectType(data: any): DisplayType {
        // Null/undefined
        if (data === null || data === undefined) {
            return 'text';
        }

        // String detection
        if (typeof data === 'string') {
            // File paths
            if (data.match(/\.(pdf|png|jpg|jpeg|gif|svg)$/i)) {
                return data.match(/\.(png|jpg|jpeg|gif|svg)$/i) ? 'image' : 'file';
            }
            // URLs
            if (data.match(/^https?:\/\//i)) {
                return 'link';
            }
            // JSON string
            try {
                JSON.parse(data);
                return 'json';
            } catch {
                return 'text';
            }
        }

        // Array detection
        if (Array.isArray(data)) {
            // Array of objects → Table
            if (data.length > 0 && typeof data[0] === 'object') {
                return 'table';
            }
            // Array of primitives or mixed → JSON
            return 'json';
        }

        // Object detection
        if (typeof data === 'object') {
            return 'json';
        }

        // Numbers, booleans, etc.
        return 'text';
    }
}

export default DisplayAction;
