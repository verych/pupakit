import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import { TREE_NODE_OFFSET } from '../../../../../internal/constants/tree-node-offset.const';

@Component({
  selector: 'pupa-tree-node-skeleton',
  templateUrl: './tree-node-skeleton.component.html',
  styleUrls: ['./tree-node-skeleton.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeNodeSkeletonComponent {
  @Input() public level: number;

  public get offset(): string {
    return `${this.level * TREE_NODE_OFFSET}px`;
  }
}
