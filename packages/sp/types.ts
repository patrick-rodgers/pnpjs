// reference: https://msdn.microsoft.com/en-us/library/office/dn600183.aspx

export const emptyGuid = "00000000-0000-0000-0000-000000000000";

/**
 * Represents the unique sequential location of a change within the change log.
 */
export interface IChangeToken {
    /**
     * Gets or sets a string value that contains the serialized representation of the change token generated by the protocol server.
     */
    StringValue: string;
}

/**
 * Contains options used to modify the behaviour of a move or copy operation
 */
export interface IMoveCopyOptions {
    /**
     * Boolean specifying whether to rename and copy the source file when the destination file exists
     */
    KeepBoth: boolean;

    /**
     * Boolean specifying whether to reset the destination of the copy author to the current user and the created by datetime to the current time.
     */
    ResetAuthorAndCreatedOnCopy: boolean;

    /**
     * Boolean specifying whether to allow File and Folder Move operations when file contain co-authoring shared locks
     */
    ShouldBypassSharedLocks: boolean;

    /**
     * Boolean specifying whether to retain the source of the move's editor and modified by datetime.
     */
    RetainEditorAndModifiedOnMove: boolean;
}

/**
 * Defines a query that is performed against the change log.
 */
export interface IChangeQuery {
    /**
     * Gets or sets a value that specifies whether add changes are included in the query.
     */
    Add?: boolean;

    /**
     * Gets or sets a value that specifies whether changes to alerts are included in the query.
     */
    Alert?: boolean;

    /**
     * Gets or sets a value that specifies the end date and end time for changes that are returned through the query.
     */
    ChangeTokenEnd?: IChangeToken;

    /**
     * Gets or sets a value that specifies the start date and start time for changes that are returned through the query.
     */
    ChangeTokenStart?: IChangeToken;

    /**
     * Gets or sets a value that specifies whether changes to content types are included in the query.
     */
    ContentType?: boolean;

    /**
     * Gets or sets a value that specifies whether deleted objects are included in the query.
     */
    DeleteObject?: boolean;

    /**
     * Gets or sets a value that specifies whether changes to fields are included in the query.
     */
    Field?: boolean;

    /**
     * Gets or sets a value that specifies whether changes to files are included in the query.
     */
    File?: boolean;

    /**
     * Gets or sets value that specifies whether changes to folders are included in the query.
     */
    Folder?: boolean;

    /**
     * Gets or sets a value that specifies whether changes to groups are included in the query.
     */
    Group?: boolean;

    /**
     * Gets or sets a value that specifies whether adding users to groups is included in the query.
     */
    GroupMembershipAdd?: boolean;

    /**
     * Gets or sets a value that specifies whether deleting users from the groups is included in the query.
     */
    GroupMembershipDelete?: boolean;

    /**
     * Gets or sets a value that specifies whether general changes to list items are included in the query.
     */
    Item?: boolean;

    /**
     * Gets or sets a value that specifies whether changes to lists are included in the query.
     */
    List?: boolean;

    /**
     * Gets or sets a value that specifies whether move changes are included in the query.
     */
    Move?: boolean;

    /**
     * Gets or sets a value that specifies whether changes to the navigation structure of a site collection are included in the query.
     */
    Navigation?: boolean;

    /**
     * Gets or sets a value that specifies whether renaming changes are included in the query.
     */
    Rename?: boolean;

    /**
     * Gets or sets a value that specifies whether restoring items from the recycle bin or from backups is included in the query.
     */
    Restore?: boolean;

    /**
     * Gets or sets a value that specifies whether adding role assignments is included in the query.
     */
    RoleAssignmentAdd?: boolean;

    /**
     * Gets or sets a value that specifies whether adding role assignments is included in the query.
     */
    RoleAssignmentDelete?: boolean;

    /**
     * Gets or sets a value that specifies whether adding role assignments is included in the query.
     */
    RoleDefinitionAdd?: boolean;

    /**
     * Gets or sets a value that specifies whether adding role assignments is included in the query.
     */
    RoleDefinitionDelete?: boolean;

    /**
     * Gets or sets a value that specifies whether adding role assignments is included in the query.
     */
    RoleDefinitionUpdate?: boolean;

    /**
     * Gets or sets a value that specifies whether modifications to security policies are included in the query.
     */
    SecurityPolicy?: boolean;

    /**
     * Gets or sets a value that specifies whether changes to site collections are included in the query.
     */
    Site?: boolean;

    /**
     * Gets or sets a value that specifies whether updates made using the item SystemUpdate method are included in the query.
     */
    SystemUpdate?: boolean;

    /**
     * Gets or sets a value that specifies whether update changes are included in the query.
     */
    Update?: boolean;

    /**
     * Gets or sets a value that specifies whether changes to users are included in the query.
     */
    User?: boolean;

    /**
     * Gets or sets a value that specifies whether changes to views are included in the query.
     */
    View?: boolean;

    /**
     * Gets or sets a value that specifies whether changes to Web sites are included in the query.
     */
    Web?: boolean;
}

/**
 * Specifies the type of a principal.
 */
export enum PrincipalType {
    /**
     * Enumeration whose value specifies no principal type.
     */
    None = 0,
    /**
     * Enumeration whose value specifies a user as the principal type.
     */
    User = 1,
    /**
     * Enumeration whose value specifies a distribution list as the principal type.
     */
    DistributionList = 2,
    /**
     * Enumeration whose value specifies a security group as the principal type.
     */
    SecurityGroup = 4,
    /**
     * Enumeration whose value specifies a group as the principal type.
     */
    SharePointGroup = 8,
    /**
     * Enumeration whose value specifies all principal types.
     */
    // eslint-disable-next-line no-bitwise
    All = SharePointGroup | SecurityGroup | DistributionList | User,
}

/**
 * Specifies the source of a principal.
 */
export enum PrincipalSource {
    /**
     * Enumeration whose value specifies no principal source.
     */
    None = 0,
    /**
     * Enumeration whose value specifies user information list as the principal source.
     */
    UserInfoList = 1,
    /**
     * Enumeration whose value specifies Active Directory as the principal source.
     */
    Windows = 2,
    /**
     * Enumeration whose value specifies the current membership provider as the principal source.
     */
    MembershipProvider = 4,
    /**
     * Enumeration whose value specifies the current role provider as the principal source.
     */
    RoleProvider = 8,
    /**
     * Enumeration whose value specifies all principal sources.
     */
    // eslint-disable-next-line no-bitwise
    All = RoleProvider | MembershipProvider | Windows | UserInfoList,
}

export interface IPrincipalInfo {
    Department: string;
    DisplayName: string;
    Email: string;
    JobTitle: string;
    LoginName: string;
    Mobile: string;
    PrincipalId: number;
    PrincipalType: PrincipalType;
    SIPAddress: string;
}

export enum PageType {
    Invalid = -1,
    DefaultView,
    NormalView,
    DialogView,
    View,
    DisplayForm,
    DisplayFormDialog,
    EditForm,
    EditFormDialog,
    NewForm,
    NewFormDialog,
    SolutionForm,
    PAGE_MAXITEMS,
}
