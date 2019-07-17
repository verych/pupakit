import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

import { isNullOrUndefined } from './../../../helpers/is-null-or-undefined.helper';

export type ButtonType = 'solid' | 'outlined' | 'link';
export type ButtonSize = 'large' | 'medium' | 'small';
export type ButtonColor = 'normal' | 'negative' | 'positive' | 'alert';
export type ButtonIconPosition = 'left' | 'right';
export interface ButtonIcon {
  name: string;
  position: 'left' | 'right';
}

@Component({
  selector: 'pupa-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  @ViewChild('buttonElement', { static: true }) public buttonElement: ElementRef<HTMLButtonElement>;

  @Input() public type: ButtonType = 'solid';
  @Input() public size: ButtonSize = 'medium';
  @Input() public color: ButtonColor = 'normal';
  @Input() public disabled: boolean = false;
  @Input() public icon: ButtonIcon = null;
  @Input() public loader: boolean = false;

  @Output() public onclick: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

  public get resultClassList(): string[] {
    return [this.type, this.size, this.color, this.loader ? 'with-loader' : null]
      .filter((innerClass: string) => !isNullOrUndefined(innerClass))
      .map((innerProperty: string) => `button_${innerProperty}`);
  }

  public processClickEvent(event: MouseEvent): void {
    this.buttonElement.nativeElement.blur();
    if (this.disabled) {
      return;
    }
    this.onclick.emit(event);
  }
}
