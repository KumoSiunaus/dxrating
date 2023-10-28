import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
} from "@mui/material";
import { FC, useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ListActions } from "react-use/lib/useList";
import sqljs, { Database } from "sql.js";
import { PlayEntry } from "../components/RatingCalculatorAddEntryForm";
import { SheetListItemContent } from "../components/SheetListItem";
import { FlattenedSheet, canonicalIdFromParts, useSheets } from "../songs";
import {
  AquaGamePlay,
  AquaUser,
  readAquaGamePlays,
  readAquaUsers,
} from "../utils/aquaDB";

import IconMdiDatabase from "~icons/mdi/database";

export const ImportFromAquaSQLiteListItem: FC<{
  modifyEntries: ListActions<PlayEntry>;
  onClose: () => void;
}> = ({ modifyEntries, onClose }) => {
  const [db, setDb] = useState<Database | null>(null);
  const handleClose = useCallback(() => {
    setDb(null);
    onClose();
  }, [onClose]);

  return (
    <>
      {db && (
        <Dialog open={true} onClose={handleClose}>
          <ImportFromAquaSQLiteDatabaseContent
            db={db}
            modifyEntries={modifyEntries}
            onClose={handleClose}
          />
        </Dialog>
      )}

      <MenuItem
        color="primary"
        onClick={() => {
          toast.promise(
            new Promise((resolve, reject) => {
              const fileInput = document.createElement("input");
              fileInput.type = "file";
              fileInput.accept = ".sqlite";
              fileInput.addEventListener("change", async () => {
                const file = fileInput.files?.[0];
                if (!file) {
                  return reject("No file selected");
                }

                const SQL = await sqljs({
                  // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
                  // You can omit locateFile completely when running in node
                  locateFile: (file) => `https://sql.js.org/dist/${file}`,
                });

                const r = new FileReader();
                r.onload = function () {
                  if (r.result === null || typeof r.result === "string") {
                    return reject(
                      "Failed to load file: unknown error: no result received from FileReader (typeof: " +
                        typeof r.result +
                        ")",
                    );
                  }

                  const Uints = new Uint8Array(r.result);
                  const db = new SQL.Database(Uints);
                  setDb(db);
                  resolve("Database loaded.");
                };
                r.readAsArrayBuffer(file);
              });
              fileInput.click();
            }),
            {
              loading: "Loading database...",
              success: "Database has been loaded.",
              error: "Failed to load database.",
            },
          );
        }}
      >
        <ListItemIcon>
          <IconMdiDatabase />
        </ListItemIcon>
        <ListItemText>Import from Aqua SQLite...</ListItemText>
      </MenuItem>
    </>
  );
};

type AquaFilteredMappedEntry = {
  gameplay: AquaGamePlay;
  sheet: FlattenedSheet;
};

type AquaFilteredIntermediateEntry = {
  sheet?: FlattenedSheet;
  gameplay: AquaGamePlay;
};

const ImportFromAquaSQLiteDatabaseContent: FC<{
  db: Database;
  modifyEntries: ListActions<PlayEntry>;
  onClose?: () => void;
}> = ({ db, modifyEntries, onClose }) => {
  const users = useMemo(() => readAquaUsers(db), [db]);
  const [selectedUser, setSelectedUser] = useState<AquaUser | null>(null);
  const { data: sheets } = useSheets();
  const [warnings, setWarnings] = useState<AquaGamePlay[]>([]);
  const records = useMemo(() => {
    if (!selectedUser) return [];
    if (!sheets) return [];

    // First, filter and map the entries as before
    const filteredMappedEntries = readAquaGamePlays(db)
      .filter((gameplay) => gameplay.user_id === selectedUser.id)
      .map((entry) => ({
        gameplay: entry,
        sheet: sheets.find(
          (sheet) =>
            sheet.internalId === entry.music_id &&
            sheet.difficulty === entry.level &&
            sheet.type === entry.type,
        ),
      })) as AquaFilteredIntermediateEntry[];

    // Now, find the maximum achievement for each music_id
    const intermediate = filteredMappedEntries.reduce((acc, entry) => {
      const existing = acc.find(
        (e) => e.gameplay.music_id === entry.gameplay.music_id,
      );

      if (!existing) {
        acc.push(entry);
      } else if (existing.gameplay.achievement < entry.gameplay.achievement) {
        Object.assign(existing, entry);
      }
      return acc;
    }, [] as AquaFilteredIntermediateEntry[]);

    const pendingGamePlayWarnings: AquaGamePlay[] = [];
    // Finally, filter out entries that don't have a sheet
    const finalized = intermediate.filter((entry) => {
      if (entry.sheet === undefined) {
        console.warn(
          `[ImportFromAquaSQLiteButton] Failed to find sheet for gameplay: ${JSON.stringify(
            entry.gameplay,
          )}`,
        );
        pendingGamePlayWarnings.push(entry.gameplay);
        return false;
      }

      return true;
    }) as AquaFilteredMappedEntry[];

    setWarnings(pendingGamePlayWarnings);

    return finalized;
  }, [db, selectedUser, sheets]);

  const mode = !selectedUser ? "select-user" : "confirm-import";

  return (
    <>
      <DialogTitle className="flex flex-col items-start">
        <div>Import from Aqua SQLite</div>
        <div className="text-sm text-gray-500">
          {mode === "select-user"
            ? "Choose the user to import their gameplays from."
            : "Confirm importing the selected user's gameplays."}
        </div>
      </DialogTitle>

      <DialogContent>
        {mode === "select-user" ? (
          <List className="b-1 b-solid b-gray-200 rounded-lg !py-0 overflow-hidden">
            {users.flatMap((user, i) => [
              <ListItemButton
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="flex gap-2"
              >
                <ListItemAvatar>
                  <img
                    src={
                      `https://dxrating-assets.imgg.dev/assetbundle/icon/ui_icon_` +
                      String(user.icon_id).padStart(6, "0") +
                      `.png`
                    }
                    alt={`Icon ${String(user.icon_id).padStart(6, "0")}`}
                    className="w-16 h-16 rounded-md bg-gray-400"
                  />
                </ListItemAvatar>
                <ListItemText className="flex flex-col">
                  <div>{user.user_name}</div>
                  <div className="tabular-nums">
                    Rating {user.highest_rating}
                  </div>
                </ListItemText>
              </ListItemButton>,

              i !== users.length - 1 && (
                <Divider component="li" key={`divider-after-${user.id}`} />
              ),
            ])}
          </List>
        ) : (
          <div className="flex flex-col">
            {warnings.length > 0 && (
              <Alert severity="warning" className="mb-4">
                <AlertTitle>Warnings</AlertTitle>

                <ul className="list-disc list-inside">
                  {warnings.map((warning) => (
                    <li key={warning.id}>
                      Failed to find sheet for a gameplay with:{" "}
                      <code className="bg-gray-2 px-1 py-0.5 rounded-sm b-1 b-solid b-gray-3">
                        music_id={warning.music_id} [{warning.type},{" "}
                        {warning.level}]
                      </code>
                      ,{" "}
                      <code className="bg-gray-2 px-1 py-0.5 rounded-sm b-1 b-solid b-gray-3">
                        achievement={warning.achievement}
                      </code>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            <List className="b-1 b-solid b-gray-200 rounded-lg overflow-hidden !p-1 space-y-1">
              {records.map((record) => (
                <ListItem className="flex flex-col gap-2 w-full bg-gray-2 p-1 rounded-md">
                  <div className="w-full">
                    <SheetListItemContent sheet={record.sheet} />
                  </div>

                  <div className="text-right w-full text-sm">
                    {record.gameplay.achievement / 10000}%
                  </div>
                </ListItem>
              ))}
            </List>
          </div>
        )}
      </DialogContent>

      {mode === "confirm-import" && (
        <DialogActions>
          <Button onClick={() => setSelectedUser(null)}>Back</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              modifyEntries.set(
                records.map((record) => ({
                  sheetId: canonicalIdFromParts(
                    record.sheet.songId,
                    record.sheet.type,
                    record.sheet.difficulty,
                  ),
                  achievementRate: record.gameplay.achievement / 10000,
                })),
              );

              toast.success(
                `Imported ${records.length} gameplays from Aqua SQLite.`,
              );

              onClose?.();
            }}
          >
            Import
          </Button>
        </DialogActions>
      )}
    </>
  );
};
