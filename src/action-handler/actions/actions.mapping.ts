import ExtractAction from "./extract.action";
import ExtractAllAction from "./extractAll.action";
import { Delay } from "./delay.actions";
import NavigateAction from "./navigate.action";
import ClickAction from "./click.action";
import TypeAction from "./type.action";
import ScreenshotAction from "./screenshot.action";
import LoopAction from "./loop.action";
import KeyboardPressAction from "./keyboard-press.action";
import LoggerAction from "./logger.action";
import TransformAction from "./transform.action";
import GetAllElementsAction from "./getAll.action";
import StoreDataAction from "./store-data.action";
import GetElementAction from "./get.action";
import DownloadAction from "./download.actions";

export type ActionName = keyof typeof actionsMapping;
export const actionsMapping = {
    'extract': ExtractAction,
    'extractAll': ExtractAllAction,
    'wait': Delay,
    'navigate': NavigateAction,
    'click': ClickAction,
    'type': TypeAction,
    'screenshot': ScreenshotAction,
    'loop': LoopAction,
    'keyboardPress': KeyboardPressAction,
    'logger': LoggerAction,
    'transform': TransformAction,
    'getAll': GetAllElementsAction,
    'storeData': StoreDataAction,
    'get': GetElementAction,
    'download': DownloadAction,
}
