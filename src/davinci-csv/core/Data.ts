interface Data {
    fields: { id: string }[];
    records: { [fieldId: string]: (number | string | null) }[];
}

export default Data;
