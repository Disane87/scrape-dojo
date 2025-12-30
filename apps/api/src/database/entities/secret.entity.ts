import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { VariableEntity } from './variable.entity';

@Entity('secrets')
export class SecretEntity {
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description?: string;

    /**
     * Encrypted value stored as base64 string
     * Format: iv:authTag:encryptedData (all base64 encoded)
     */
    @Column('text')
    encryptedValue: string;

    @CreateDateColumn({ type: 'bigint', transformer: { to: (value) => value, from: (value) => Number(value) } })
    createdAt: number;

    @UpdateDateColumn({ type: 'bigint', transformer: { to: (value) => value, from: (value) => Number(value) } })
    updatedAt: number;

    @OneToMany(() => VariableEntity, variable => variable.secret)
    variables: VariableEntity[];
}
