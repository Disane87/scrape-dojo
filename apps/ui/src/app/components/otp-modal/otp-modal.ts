import { Component, input, output, model, ViewChild, ElementRef, AfterViewInit, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OtpRequest } from '@scrape-dojo/shared';
import { ModalComponent, ButtonComponent } from '../shared';
import { TranslocoModule } from '@jsverse/transloco';
import 'iconify-icon';

@Component({
    selector: 'app-otp-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent, TranslocoModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './otp-modal.html',
})
export class OtpModalComponent implements AfterViewInit {
    otpRequest = input<OtpRequest | null>(null);
    otpCode = model<string>('');

    submit = output<{ requestId: string; code: string }>();
    close = output<void>();

    @ViewChild('otpInput') otpInput?: ElementRef<HTMLInputElement>;

    isOpen = computed(() => this.otpRequest() !== null);
    canSubmit = computed(() => this.otpCode().length >= 4);

    ngAfterViewInit(): void {
        this.focusInput();
    }

    focusInput(): void {
        setTimeout(() => this.otpInput?.nativeElement?.focus(), 100);
    }

    submitOtp(): void {
        const request = this.otpRequest();
        const code = this.otpCode();
        if (!request || !code || code.length < 4) return;

        this.submit.emit({ requestId: request.requestId, code });
        this.otpCode.set('');
    }

    closeModal(): void {
        this.otpCode.set('');
        this.close.emit();
    }
}
