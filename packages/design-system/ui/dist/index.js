var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx } from "react/jsx-runtime";
export function Surface(_a) {
    var { children, className = "" } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("div", Object.assign({ className: `flex flex-col rounded-[28px] border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_18px_60px_rgba(19,33,44,0.08)] ${className}`.trim() }, props, { children: children })));
}
