import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grow,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  styled,
} from "@mui/material";
import {
  Row,
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import {
  FC,
  ForwardedRef,
  forwardRef,
  memo,
  useCallback,
  useMemo,
  useState,
} from "react";
import { ListActions } from "react-use/lib/useList";
import {
  ItemProps,
  ScrollerProps,
  TableBodyProps,
  TableComponents,
  TableProps,
  TableVirtuoso,
} from "react-virtuoso";
import IconMdiArrowUp from "~icons/mdi/arrow-up";
import IconMdiTrashCan from "~icons/mdi/trash-can";
import {
  PlayEntry,
  RatingCalculatorAddEntryForm,
} from "../components/rating/RatingCalculatorAddEntryForm";
import { ClearButton } from "../components/rating/io/ClearButton";
import { ExportMenu } from "../components/rating/io/ExportMenu";
import { ImportMenu } from "../components/rating/io/ImportMenu";
import { useRatingEntries } from "../components/rating/useRatingEntries";
import {
  SheetListItem,
  SheetListItemContent,
} from "../components/sheet/SheetListItem";
import { useRatingCalculatorContext } from "../models/RatingCalculatorContext";
import { useAppContextDXDataVersion } from "../models/context/useAppContext";
import { FlattenedSheet, useSheets } from "../songs";
import { Rating } from "../utils/rating";

export interface Entry {
  sheet: FlattenedSheet;
  rating: Rating | null;
  sheetId: string;
  achievementRate: number;
  includedIn: "b15" | "b35" | null;
}

const columnHelper = createColumnHelper<Entry>();

const RatingCalculatorRowActions: FC<{
  modifyEntries: ListActions<PlayEntry>;
  entry: PlayEntry;
}> = ({ modifyEntries, entry }) => {
  const { data: sheets } = useSheets();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = useCallback(() => {
    modifyEntries.filter(
      (existingEntry) => existingEntry.sheetId !== entry.sheetId,
    );
  }, []);

  const sheet = useMemo(
    () => sheets?.find((sheet) => sheet.id === entry.sheetId),
    [sheets, entry.sheetId],
  );

  return (
    <>
      <Dialog
        TransitionComponent={Grow}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        classes={{
          paper: "min-w-[20rem]",
        }}
      >
        <DialogTitle>Remove rating entry?</DialogTitle>
        <DialogContent>
          {sheet && <SheetListItemContent sheet={sheet} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>

          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setDialogOpen(false);
              handleClick();
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <IconButton size="small" onClick={() => setDialogOpen(true)}>
        <IconMdiTrashCan />
      </IconButton>
    </>
  );
};

const DenseTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(0.75 + 0.0625, 1),
}));

const TransparentPaper = styled(Paper)(() => ({
  backgroundColor: "transparent",
  boxShadow: "none",
}));

export const RatingCalculator = () => {
  const { modifyEntries } = useRatingCalculatorContext();
  const { data: sheets } = useSheets();
  const [showOnlyB50, setShowOnlyB50] = useState(false);

  const [sorting, setSorting] = useState<SortingState>([
    { id: "rating", desc: true },
  ]);

  const { allEntries } = useRatingEntries();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "chart",
        header: "Chart",
        cell: ({ row }) => (
          <SheetListItem
            sheet={row.original.sheet}
            SheetDialogContentProps={{
              currentAchievementRate: row.original.achievementRate,
            }}
            SheetListItemContentProps={{
              SheetTitleProps: {
                enableVersion: false,
                className: "flex-col",
              },
            }}
          />
        ),
        meta: {
          cellProps: {
            padding: "none",
          },
        },
        size: 500,
        minSize: 300,
      }),
      columnHelper.accessor("includedIn", {
        id: "includedIn",
        header: "Incl. In",
        cell: RatingCalculatorIncludedInCell,
        size: 50,
        minSize: 100,
      }),
      columnHelper.accessor("achievementRate", {
        id: "achievementRate",
        header: "Achievement Rate",
        cell: RatingCalculatorAchievementRateCell,
        size: 100,
        minSize: 150,
      }),
      columnHelper.accessor("rating.ratingAwardValue", {
        id: "rating",
        header: "Rating",
        cell: RatingCalculatorRatingCell,
        size: 50,
        minSize: 100,
        sortingFn: (a, b) => {
          if (!a.original.rating) return -1;
          if (!b.original.rating) return 1;
          return (
            a.original.rating.ratingAwardValue -
            b.original.rating.ratingAwardValue
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <RatingCalculatorRowActions
            entry={row.original}
            modifyEntries={modifyEntries}
          />
        ),
        size: 50,
        minSize: 100,
      }),
    ],
    [modifyEntries],
  );

  const data = useMemo(() => {
    return showOnlyB50
      ? allEntries.filter((entry) => entry.includedIn)
      : allEntries;
  }, [allEntries, showOnlyB50]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const onSubmit = useCallback(
    (entry: PlayEntry) => {
      if (
        allEntries.some(
          (existingEntry) => existingEntry.sheetId === entry.sheetId,
        )
      ) {
        modifyEntries.updateFirst(
          (existingEntry) => existingEntry.sheetId === entry.sheetId,
          entry,
        );
      } else modifyEntries.push(entry);
    },
    [allEntries, modifyEntries],
  );

  const TableComponents: TableComponents<Row<Entry>> = useMemo(
    () => ({
      Scroller: RatingCalculatorScroller,
      Table: RatingCalculatorTable,
      TableHead: TableHead,
      TableRow: RatingCalculatorTableRow,
      TableBody: RatingCalculatorTableBody,
    }),
    [],
  );
  if (!sheets) return null;

  return (
    <div className="flex-container w-full pb-global">
      <div className="flex flex-col md:flex-row items-start gap-4">
        <Alert severity="info" className="w-full">
          <AlertTitle>Your current rating</AlertTitle>
          <RatingCalculatorStatisticsTable />
        </Alert>

        <div className="flex flex-col gap-4 h-full self-stretch">
          <Alert severity="info" className="w-full overflow-auto">
            <AlertTitle>
              {allEntries?.length
                ? `Saved ${allEntries.length} records`
                : "Auto-save"}
            </AlertTitle>
            Your entries will be saved automatically to your browser's local
            storage and will be restored when you return to this page.
            <div className="flex items-center gap-2 mt-2">
              <ImportMenu modifyEntries={modifyEntries} />

              <ExportMenu />

              <div className="flex-1" />

              <ClearButton modifyEntries={modifyEntries} />
            </div>
          </Alert>

          <Alert
            severity="info"
            className="w-full"
            classes={{
              message: "overflow-unset",
            }}
          >
            <AlertTitle>Quick Actions</AlertTitle>
            <div className="flex items-center gap-2 mt-2">
              <FormControlLabel
                control={
                  <Switch
                    checked={showOnlyB50}
                    onChange={() => setShowOnlyB50((prev) => !prev)}
                  />
                }
                label="Show only B50 entries"
              />
            </div>
          </Alert>
        </div>
      </div>

      <RatingCalculatorAddEntryForm onSubmit={onSubmit} />

      <div className="max-w-screen w-full overflow-x-auto -mx-4">
        <TableVirtuoso<Row<Entry>>
          useWindowScroll
          data={table.getRowModel().rows}
          className="w-full overflow-y-hidden"
          increaseViewportBy={1000}
          components={TableComponents}
          fixedHeaderContent={() =>
            table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableCell
                      key={header.id}
                      colSpan={header.colSpan}
                      className={clsx(
                        "group bg-gray-900/5 transition",
                        header.column.getCanSort() &&
                          "cursor-pointer select-none hover:bg-gray-900/10 active:bg-gray-900/20 leading-tight py-4",
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <IconMdiArrowUp
                            className={clsx(
                              "ml-1 transition",
                              {
                                asc: "inline-flex rotate-0",
                                desc: "inline-flex rotate-180",
                                none: header.column.getCanSort()
                                  ? "inline-flex opacity-0 group-hover:opacity-70"
                                  : "hidden",
                              }[
                                (header.column.getIsSorted() as string) ||
                                  "none"
                              ],
                            )}
                          />
                        </div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          }
          itemContent={(_, row) => (
            <RatingCalculatorTableRowContent row={row} />
          )}
        />

        {allEntries.length === 0 && (
          <div className="w-full text-sm py-8 px-4 text-center">No entries</div>
        )}
      </div>
    </div>
  );
};

const RatingCalculatorIncludedInCell: FC<{
  row: Row<Entry>;
}> = memo(({ row }) => {
  const includedIn = row.original.includedIn;
  if (!includedIn) return null;

  return (
    <div
      className={clsx(
        "tabular-nums w-12 leading-none py-1.5 rounded-full text-white text-center shadow select-none",
        includedIn === "b15" && "bg-amber-500",
        includedIn === "b35" && "bg-cyan-500",
      )}
    >
      {includedIn.toUpperCase()}
    </div>
  );
});
RatingCalculatorIncludedInCell.displayName =
  "memo(RatingCalculatorIncludedInCell)";

const RatingCalculatorAchievementRateCell: FC<{
  row: Row<Entry>;
}> = ({ row }) => (
  <span className="font-sans tabular-nums">
    {row.original.achievementRate.toFixed(4)}%
  </span>
);

const RatingCalculatorTable: FC<TableProps> = (props: TableProps) => (
  <Table
    {...props}
    size="small"
    className="rounded-lg w-full min-w-2xl"
    style={{ borderCollapse: "separate" }}
  />
);

const RatingCalculatorTableBody = forwardRef(
  (props: TableBodyProps, ref: ForwardedRef<HTMLTableSectionElement>) => (
    <TableBody {...props} ref={ref} />
  ),
);

const RatingCalculatorTableRow: FC<ItemProps<Row<Entry>>> = ({
  item,
  ...props
}) => (
  <TableRow
    {...props}
    className={clsx(
      "tabular-nums w-full",
      {
        b15: "bg-amber-200",
        b35: "bg-cyan-200",
        none: undefined,
      }[item.original.includedIn ?? "none"],
    )}
  />
);

const RatingCalculatorScroller = forwardRef(
  (props: ScrollerProps, ref: ForwardedRef<HTMLDivElement>) => (
    <TableContainer component={TransparentPaper} {...props} ref={ref} />
  ),
);

const RatingCalculatorRatingCell: FC<{
  row: Row<Entry>;
}> = ({ row }) => (
  <span className="font-sans tabular-nums">
    {row.original.rating ? row.original.rating.ratingAwardValue : "-"}
  </span>
);

const RatingCalculatorTableRowContent: FC<{
  row: Row<Entry>;
}> = memo(({ row }) => {
  return (
    <>
      {row.getVisibleCells().map((cell) => {
        return (
          <TableCell
            key={cell.id}
            {...(
              cell.column.columnDef.meta as {
                cellProps?: Record<string, unknown>;
              }
            )?.cellProps}
            style={{ width: cell.column.getSize() }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
    </>
  );
});
RatingCalculatorTableRowContent.displayName =
  "memo(RatingCalculatorTableRowContent)";

export const RatingCalculatorStatisticsTable: FC = () => {
  const { b35Entries, b15Entries, statistics } = useRatingEntries();
  const appVersion = useAppContextDXDataVersion();
  const { b15Average, b35Average, b15Min, b35Min, b15Max, b35Max } = statistics;

  return (
    <Table size="small" className="-ml-2 w-full">
      <TableHead>
        <TableRow>
          <DenseTableCell className="w-sm">Item</DenseTableCell>
          <DenseTableCell>Matches</DenseTableCell>
          <DenseTableCell>Statistics</DenseTableCell>
          <DenseTableCell>Total</DenseTableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <DenseTableCell className="flex flex-col">
            <div className="font-bold text-lg">B15</div>
            <div className="text-gray-500">
              Best 15 plays on songs released at current version ({appVersion})
            </div>
          </DenseTableCell>
          <DenseTableCell>{b15Entries.length}</DenseTableCell>
          <DenseTableCell>
            {b15Entries.length > 0 ? (
              <div className="flex flex-col items-start">
                <span className="whitespace-nowrap">
                  Avg: {b15Average.toFixed(2)}
                </span>
                <span className="whitespace-nowrap">Min: {b15Min}</span>
                <span className="whitespace-nowrap">Max: {b15Max}</span>
              </div>
            ) : (
              "—"
            )}
          </DenseTableCell>

          <DenseTableCell>
            {b15Entries.reduce(
              (sum, entry) => sum + (entry.rating?.ratingAwardValue ?? 0),
              0,
            )}
          </DenseTableCell>
        </TableRow>

        <TableRow>
          <DenseTableCell className="flex flex-col">
            <div className="font-bold text-lg">B35</div>
            <div className="text-gray-500">
              Best 35 plays on all other songs except ones released at current
              version ({appVersion})
            </div>
          </DenseTableCell>
          <DenseTableCell>{b35Entries.length}</DenseTableCell>
          <DenseTableCell>
            {b35Entries.length > 0 ? (
              <div className="flex flex-col items-start">
                <span className="whitespace-nowrap">
                  Avg: {b35Average.toFixed(2)}
                </span>
                <span className="whitespace-nowrap">Min: {b35Min}</span>
                <span className="whitespace-nowrap">Max: {b35Max}</span>
              </div>
            ) : (
              "—"
            )}
          </DenseTableCell>
          <DenseTableCell>
            {b35Entries.reduce(
              (sum, entry) => sum + (entry.rating?.ratingAwardValue ?? 0),
              0,
            )}
          </DenseTableCell>
        </TableRow>

        <TableRow>
          <DenseTableCell colSpan={3}>
            <span className="font-bold">Total</span>
          </DenseTableCell>
          <DenseTableCell>
            {[...b15Entries, ...b35Entries].reduce(
              (sum, entry) => sum + (entry.rating?.ratingAwardValue ?? 0),
              0,
            )}
          </DenseTableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};
