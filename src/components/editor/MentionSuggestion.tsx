import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import MentionList from "./MentionList";

export interface MentionItem {
    id: string;
    label: string;
    sublabel?: string;
    type: string;
    icon?: string;
    image?: string;
}

export const createMentionSuggestion = (
    searchMentions: (query: string) => Promise<MentionItem[]>
) => {
    return {
        items: async ({ query }: { query: string }) => {
            const results = await searchMentions(query);
            return results;
        },

        render: () => {
            let component: ReactRenderer;
            let popup: TippyInstance[];

            return {
                onStart: (props: any) => {
                    component = new ReactRenderer(MentionList, {
                        props,
                        editor: props.editor,
                    });

                    if (!props.clientRect) {
                        return;
                    }

                    popup = tippy("body", {
                        getReferenceClientRect: props.clientRect,
                        appendTo: () => document.body,
                        content: component.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: "manual",
                        placement: "bottom-start",
                        theme: "mention-popup",
                        maxWidth: 400,
                    });
                },

                onUpdate(props: any) {
                    if (component) component.updateProps(props);

                    if (!props.clientRect || !popup || !popup[0]) {
                        return;
                    }

                    popup[0].setProps({
                        getReferenceClientRect: props.clientRect,
                    });
                },

                onKeyDown(props: any) {
                    if (props.event.key === "Escape") {
                        if (popup && popup[0]) popup[0].hide();
                        return true;
                    }

                    return (component as any)?.ref?.onKeyDown(props);
                },

                onExit() {
                    popup[0].destroy();
                    component.destroy();
                },
            };
        },
    };
};
