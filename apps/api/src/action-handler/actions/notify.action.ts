import { BaseAction } from "./bases/base.action";
import { Action } from "../_decorators/action.decorator";

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type NotifyActionParams = {
    /** Notification title */
    title: string;
    /** Notification message */
    message: string;
    /** Notification type: info, success, warning, error */
    type?: NotificationType;
    /** Show browser notification (requires user permission) */
    browserNotification?: boolean;
    /** Auto-dismiss after ms (0 = manual dismiss, default: 5000) */
    autoDismiss?: number;
}

@Action('notify', {
    displayName: 'Notify',
    icon: 'Bell',
    description: 'Send a notification to the user via modal and/or browser notification',
    color: 'blue',
    category: 'utility'
})
export class NotifyAction extends BaseAction<NotifyActionParams> {

    async run(): Promise<boolean> {
        const {
            title,
            message,
            type = 'info',
            browserNotification = false,
            autoDismiss = 5000
        } = this.params;

        this.logger.log(`🔔 Sending notification: "${title}"`);

        if (!this.data?.scrapeEventsService) {
            this.logger.warn('⚠️ No events service available, notification will only be logged');
            this.logger.log(`📢 [${type.toUpperCase()}] ${title}: ${message}`);
            return true;
        }

        // Get job icon URL if available
        let iconUrl: string | undefined;
        if (this.data.metadata?.icon) {
            const icon = this.data.metadata.icon;
            if (icon.startsWith('http://') || icon.startsWith('https://')) {
                iconUrl = icon;
            } else if (icon.startsWith('data:')) {
                iconUrl = icon;
            } else {
                // Relative path - construct full URL
                // Browser notifications need absolute URLs
                iconUrl = `/assets/icons/${icon}`;
            }
        }

        // Send notification via events service
        await this.data.scrapeEventsService.sendNotification(
            this.data.scrapeId || 'unknown',
            this.data.runId,
            {
                type,
                title,
                message,
                browserNotification,
                autoDismiss,
                iconUrl
            }
        );

        this.logger.log(`✅ Notification sent: "${title}"`);
        return true;
    }
}

export default NotifyAction;
