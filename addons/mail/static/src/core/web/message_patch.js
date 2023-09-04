/* @odoo-module */

import { Message } from "@mail/core/common/message";
import { markEventHandled } from "@web/core/utils/misc";

import { deserializeDateTime, formatDate, formatDateTime } from "@web/core/l10n/dates";
import { _t } from "@web/core/l10n/translation";
import {
    formatChar,
    formatInteger,
    formatMonetary,
    formatText,
} from "@web/views/fields/formatters";
import { formatFloat } from "@web/core/utils/numbers";
import { useService } from "@web/core/utils/hooks";
import { patch } from "@web/core/utils/patch";
import { useState } from "@odoo/owl";

patch(Message.prototype, {
    setup() {
        super.setup(...arguments);
        this.action = useService("action");
        this.userService = useService("user");
        this.messaging = useState(useService("mail.messaging"));
    },
    get authorAvatarAttClass() {
        return {
            ...super.authorAvatarAttClass,
            "o_redirect cursor-pointer": this.hasAuthorClickable,
        };
    },
    getAuthorText() {
        return this.hasAuthorClickable() ? _t("Open profile") : undefined;
    },
    hasAuthorClickable() {
        return this.message.author && !this.message.isSelfAuthored;
    },
    onClickAuthor(ev) {
        if (this.hasAuthorClickable()) {
            markEventHandled(ev, "Message.ClickAuthor");
            this.messaging.openDocument({
                model: "res.partner",
                id: this.message.author.id,
            });
        }
    },
    openRecord() {
        this.threadService.open(this.message.originThread);
    },

    /**
     * @returns {string}
     */
    formatTracking(trackingValue) {
        /**
         * Maps tracked field type to a JS formatter. Tracking values are
         * not always stored in the same field type as their origin type.
         * Field types that are not listed here are not supported by
         * tracking in Python. Also see `create_tracking_values` in Python.
         */
        switch (trackingValue.fieldType) {
            case "boolean":
                return trackingValue.value ? _t("Yes") : _t("No");
            /**
             * many2one formatter exists but is expecting id/display_name or data
             * object but only the target record name is known in this context.
             *
             * Selection formatter exists but requires knowing all
             * possibilities and they are not given in this context.
             */
            case "char":
            case "many2one":
            case "selection":
                return formatChar(trackingValue.value);
            case "date":
                if (trackingValue.value) {
                    return luxon.DateTime.fromISO(trackingValue.value, { zone: "utc" })
                        .setZone("system")
                        .toLocaleString({ locale: this.userService.lang.replace("_", "-") });
                }
                return formatDate(trackingValue.value);
            case "datetime": {
                const value = trackingValue.value
                    ? deserializeDateTime(trackingValue.value)
                    : trackingValue.value;
                return formatDateTime(value);
            }
            case "float":
                return formatFloat(trackingValue.value);
            case "integer":
                return formatInteger(trackingValue.value);
            case "text":
                return formatText(trackingValue.value);
            case "monetary":
                return formatMonetary(trackingValue.value, {
                    currencyId: trackingValue.currencyId,
                });
            default:
                return trackingValue.value;
        }
    },

    /**
     * @returns {string}
     */
    formatTrackingOrNone(trackingValue) {
        const formattedValue = this.formatTracking(trackingValue);
        return formattedValue || _t("None");
    },
});
