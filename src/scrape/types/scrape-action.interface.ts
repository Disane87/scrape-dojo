import ExtractAction from "src/action-handler/actions/extract.action";
import ExtractAllAction from "src/action-handler/actions/extractAll.action";
import { ActionName } from "src/action-handler/actions/types/actionnames.type";
import { WaitAction } from "src/action-handler/actions/wait.actions";


// Mapping von `ActionName` zu den Parametertypen
export type ActionParamsMapping = {
    extract: { selector: string };
    extractAll: { selector: string };
    wait: { time: number };
    // Weitere Action-Parametertypen hier hinzufügen
};

export interface ScrapeAction<T> {
    name: string;

    action: ActionName;

    params: T ;


}