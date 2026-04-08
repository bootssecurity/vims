var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { PrimaryKey, Property } from "@mikro-orm/core";
import { v4 as uuidv4 } from "uuid";
/**
 * Vims standard BaseEntity definition mimicking exact MikroORM properties
 */
export class BaseEntity {
    constructor() {
        this.id = `ent_${uuidv4().replace(/-/g, "").substring(0, 26)}`;
        this.created_at = new Date();
        this.updated_at = new Date();
        this.deleted_at = null;
    }
}
__decorate([
    PrimaryKey({ columnType: "text" }),
    __metadata("design:type", String)
], BaseEntity.prototype, "id", void 0);
__decorate([
    Property({
        onCreate: () => new Date(),
        columnType: "timestamptz",
        defaultRaw: "now()",
    }),
    __metadata("design:type", Object)
], BaseEntity.prototype, "created_at", void 0);
__decorate([
    Property({
        onCreate: () => new Date(),
        onUpdate: () => new Date(),
        columnType: "timestamptz",
        defaultRaw: "now()",
    }),
    __metadata("design:type", Object)
], BaseEntity.prototype, "updated_at", void 0);
__decorate([
    Property({ columnType: "timestamptz", nullable: true }),
    __metadata("design:type", Object)
], BaseEntity.prototype, "deleted_at", void 0);
