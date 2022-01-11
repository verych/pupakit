import { ListRange } from '@angular/cdk/collections';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { isEmpty, isNil, shareReplayWithRefCount } from '@bimeister/utilities';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map, startWith, switchMap, take } from 'rxjs/operators';
import { FlatHugeTreeItem } from '../../../../../internal/declarations/classes/flat-huge-tree-item.class';
import { ComponentChange } from '../../../../../internal/declarations/interfaces/component-change.interface';
import { ComponentChanges } from '../../../../../internal/declarations/interfaces/component-changes.interface';
import { HugeTreeState } from '../../../../../internal/declarations/interfaces/huge-tree-state.interface';
import { HugeTreeExpandedItemsService } from '../services/huge-tree-expanded-items.service';

interface ObjectWithLength {
  length: number;
}

const ITEM_BUFFER_COUNT: number = 50;

@Component({
  selector: 'pupa-huge-tree',
  templateUrl: './huge-tree.component.html',
  styleUrls: ['./huge-tree.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HugeTreeExpandedItemsService],
})
export class HugeTreeComponent implements OnChanges, AfterViewInit {
  @ViewChild('viewport', { static: true }) public readonly viewport: CdkVirtualScrollViewport;
  public readonly expandedTreeItemIds$: Observable<string[]> = this.hugeTreeExpandedItemsService.expandedTreeItemIds$;

  public readonly dataObjectWithLength$: BehaviorSubject<ObjectWithLength> = new BehaviorSubject<ObjectWithLength>({
    length: 0,
  });
  @Input() public treeItemSizePx: number;
  public readonly treeItemSizePx$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  public treeItemsData: FlatHugeTreeItem[] = [];
  @Output() public updateNeeded: EventEmitter<void> = new EventEmitter<void>();

  public readonly bufferPx$: Observable<number> = this.treeItemSizePx$.pipe(
    map((sizePx: number) => sizePx * ITEM_BUFFER_COUNT),
    shareReplayWithRefCount()
  );

  private readonly subscription: Subscription = new Subscription();

  constructor(
    private readonly hugeTreeExpandedItemsService: HugeTreeExpandedItemsService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  public ngOnChanges(changes: ComponentChanges<this>): void {
    this.processTreeItemSizeChanges(changes?.treeItemSizePx);
  }

  public ngAfterViewInit(): void {
    this.subscription.add(this.emitRequestParamsChanges());
  }

  public isExpanded(expandedIds: string[], id: string): boolean {
    return !isNil(id) && expandedIds.includes(id);
  }

  public toggleExpansion(id: string, parentId: string): void {
    this.hugeTreeExpandedItemsService.toggleExpansion(id, parentId);
  }

  public expandParentsByIds(parentIds: string[]): void {
    this.hugeTreeExpandedItemsService.expandParents(parentIds);
  }

  public getTreeNodeDataByIndex(index: number, totalTreeItemsLength: number): FlatHugeTreeItem | undefined {
    if (isNil(index) || isEmpty(this.treeItemsData)) {
      return undefined;
    }
    const currentRenderedRange: ListRange = this.viewport.getRenderedRange();
    const roundedRange: ListRange | undefined = this.roundListRange(currentRenderedRange, totalTreeItemsLength);

    const neededIndex: number = isNil(roundedRange) ? index : index - roundedRange.start;

    return this.treeItemsData[neededIndex];
  }

  public getTreeState(): Observable<HugeTreeState> {
    return combineLatest([
      this.expandedTreeItemIds$,
      this.viewport.scrolledIndexChange.pipe(startWith(0)),
      this.dataObjectWithLength$,
    ]).pipe(
      take(1),
      map(([expandedItemIds, currentFirstVisibleIndex, dataObjectWithLength]: [string[], number, ObjectWithLength]) => {
        const actualRange: ListRange = this.viewport.getRenderedRange();
        const totalTreeItemsLength: number = dataObjectWithLength.length;
        const currentTreeItemsLength: number = this.treeItemsData.length;

        return {
          range: actualRange,
          expandedItemIds,
          currentIndex: currentFirstVisibleIndex,
          totalCount: totalTreeItemsLength,
          currentTreeItemsLength,
        };
      })
    );
  }

  public setTreeState(
    totalCount: number,
    treeItems: FlatHugeTreeItem[],
    needToScroll?: boolean,
    indexToScroll?: number
  ): void {
    this.setTreeItemsData(treeItems);

    this.setDataObjectLength(totalCount);

    if (needToScroll) {
      requestAnimationFrame(() => {
        this.viewport.scrollToIndex(indexToScroll);
        this.changeDetectorRef.detectChanges();
      });
    }
  }

  public setTreeItemsData(treeItemsData: FlatHugeTreeItem[]): void {
    if (isEmpty(treeItemsData)) {
      return;
    }

    this.treeItemsData = treeItemsData;
    this.changeDetectorRef.detectChanges();
  }

  public roundListRange(range: ListRange, totalCount: number): ListRange {
    const { start, end }: ListRange = range;

    const countItemsInViewport: number = end - start;
    const minimumRoundValue: number = ITEM_BUFFER_COUNT;

    const numberRankIndex: number = String(countItemsInViewport).length - 1;
    const roundValue: number = Math.max(numberRankIndex * 10, minimumRoundValue);

    const possibleStart: number = start - countItemsInViewport;
    const roundedStart: number = Math.max(Math.round(possibleStart / roundValue) * roundValue, 0);

    const possibleEnd: number = end + countItemsInViewport;
    const serializedTotalCount: number = totalCount ?? start + countItemsInViewport;

    const roundedEnd: number = Math.min(Math.round(possibleEnd / roundValue) * roundValue, serializedTotalCount);
    const convertedEnd: number = roundedEnd === 0 ? roundValue : roundedEnd;

    return { start: roundedStart, end: convertedEnd };
  }

  private setDataObjectLength(length: number): void {
    const objectWithLength: ObjectWithLength = { length };
    this.dataObjectWithLength$.next(objectWithLength);
  }

  private processTreeItemSizeChanges(change: ComponentChange<this, number>): void {
    const updatedValue: number | undefined = change?.currentValue;

    if (isNil(updatedValue)) {
      return;
    }

    this.treeItemSizePx$.next(updatedValue);
  }

  private emitRequestParamsChanges(): Subscription {
    return combineLatest([this.expandedTreeItemIds$, this.viewport.scrolledIndexChange.pipe(startWith(0))])
      .pipe(
        switchMap(() => this.getTreeState()),
        distinctUntilChanged((prevState: HugeTreeState, currState: HugeTreeState) => {
          const prevRoundedRange: ListRange = this.roundListRange(prevState.range, prevState.totalCount);
          const currRoundedRange: ListRange = this.roundListRange(currState.range, currState.totalCount);

          return (
            JSON.stringify(prevState.expandedItemIds) === JSON.stringify(currState.expandedItemIds) &&
            prevRoundedRange.end === currRoundedRange.end &&
            prevRoundedRange.start === currRoundedRange.start
          );
        })
      )
      .subscribe(() => this.updateNeeded.emit());
  }
}
