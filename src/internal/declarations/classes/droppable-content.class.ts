import { CdkPortal } from '@angular/cdk/portal';
import { AfterViewInit, Host, ViewChild, Directive } from '@angular/core';

import { DroppableComponent } from '../../../lib/components/droppable/components/droppable/droppable.component';

@Directive()
export abstract class DroppableContent implements AfterViewInit {
  @ViewChild(CdkPortal) public contentRef: CdkPortal;

  public get isOpened(): boolean {
    return this.droppable.isOpened;
  }

  constructor(@Host() protected readonly droppable: DroppableComponent) {}

  public ngAfterViewInit(): void {
    this.droppable.contentRef = this.contentRef;
  }

  public mouseDownHandler(event: MouseEvent): void {
    if (!this.droppable.closeOnContentClick) {
      event.stopPropagation();
    }
  }

  public mouseWheelHandler(event: WheelEvent): void {
    event.stopPropagation();
  }
}
